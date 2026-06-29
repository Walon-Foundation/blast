use crate::{config::BlastConfig, runner, stat::Stats};
use anyhow::Result;
use colored::Colorize;
use reqwest::Client;
use std::{
    path::Path,
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::{sync::Mutex, task::JoinHandle};

pub async fn run(
    config_path: &Path,
    min_rps: u64,
    max_rps: u64,
    step: u64,
    step_duration: u64,
    vars: Option<&std::path::Path>,
    assert_flags: Vec<String>,
    output: crate::OutputFormat,
) -> Result<()> {
    if min_rps == 0 {
        anyhow::bail!("rps must be at least 1");
    }

    let config = BlastConfig::load(config_path)?;
    let endpoints = crate::config::expand_by_weight(config.endpoints_with_headers("stress"));
    if endpoints.is_empty() {
        println!("{}", "no endpoints tagged \"stress\" found".yellow());
        return Ok(());
    }

    let client = Arc::new(Client::builder().timeout(Duration::from_secs(30)).cookie_store(true).build()?);

    let endpoints = Arc::new(endpoints);

    let mut ctx = config.load_setup(&client).await?;
    if let Some(vars_path) = vars {
        let file_vars = crate::config::load_vars(vars_path)?;
        for (k, v) in file_vars {
            ctx.entry(k).or_insert(v);
        }
    }
    let base_url = Arc::new(config.base_url.clone());
    let mut step_results = Vec::<Stats>::new();
    let mut current_rps = min_rps;
    let step_dur = Duration::from_secs(step_duration);

    while current_rps <= max_rps {
        if matches!(output, crate::OutputFormat::Terminal) {
            println!("\n -> step {current_rps} req/s for {}s", step_dur.as_secs());
        }

        let interval_ms = (1000u64 / current_rps).max(1);
        let start_time = Instant::now();
        let mut current_idx = 0;

        let step_raw = Arc::new(Mutex::new(Vec::<runner::RequestResult>::new()));
        let mut handles: Vec<JoinHandle<()>> = Vec::new();
        let mut ticker = tokio::time::interval(Duration::from_millis(interval_ms));

        loop {
            ticker.tick().await;

            let elapsed = start_time.elapsed();
            if elapsed >= step_dur {
                break;
            }

            let endpoint = endpoints[current_idx % endpoints.len()].clone();
            current_idx += 1;

            let client = Arc::clone(&client);
            let base_url = Arc::clone(&base_url);
            let ctx = ctx.clone();
            let step_raw = Arc::clone(&step_raw);

            let handle = tokio::spawn(async move {
                let result = runner::execute(&client, &endpoint, &base_url, &ctx).await;
                step_raw.lock().await.push(result);
            });

            handles.push(handle);
        }

        for handle in handles {
            handle.await?;
        }

        let mut step_stats = Stats::new();
        for result in step_raw.lock().await.iter() {
            step_stats.record(result.clone());
        }

        let breaking = if matches!(output, crate::OutputFormat::Terminal) {
            step_stats.print_step(current_rps)
        } else {
            step_stats.p99() > 500 || step_stats.error_rate() > 1.0
        };
        step_results.push(step_stats);

        if breaking {
            if matches!(output, crate::OutputFormat::Terminal) {
                println!(
                    "\n{}",
                    format!("⚠ breaking point at {} req/s", current_rps)
                        .red()
                        .bold()
                );
                println!("  p99:        {}ms", step_results.last().unwrap().p99());
                println!(
                    "  error rate: {:.1}%",
                    step_results.last().unwrap().error_rate()
                );
            }
            break;
        }

        current_rps += step;
    }

    match &output {
        crate::OutputFormat::Terminal => {
            println!();
            println!("{}", "─".repeat(70));
            println!(
                "  {:>6}   {:>8}   {:>7}   {:>6}   {:>6}   {:>6}   {:>6}",
                "RPS", "Requests", "Success", "p50", "p95", "p99", "Errors"
            );
            println!("{}", "─".repeat(70));

            for (i, s) in step_results.iter().enumerate() {
                let rps_val = min_rps + (i as u64) * step;
                let row = format!(
                    "  {:>6}   {:>8}   {:>6.1}%   {:>5}ms   {:>5}ms   {:>5}ms   {}",
                    rps_val,
                    s.total(),
                    s.success_rate(),
                    s.p50(),
                    s.p95(),
                    s.p99(),
                    s.failed()
                );
                if s.p99() > 500 || s.error_rate() > 1.0 {
                    println!("{}  ⚠", row.red());
                } else {
                    println!("{}", row);
                }
            }
            println!("{}", "─".repeat(70));

            let found_breaking = step_results
                .iter()
                .any(|s| s.p99() > 500 || s.error_rate() > 1.0);
            println!();
            if found_breaking {
                println!("{}", "recommendation:".bold());
                println!("check GET /metrics on your API");
                println!(" run EXPLAIN ANALYZE on your slowest query");
            } else {
                println!(
                    "{}",
                    format!("API held at {} req/s — try a higher --max-rps", max_rps).green()
                );
            }
        }
        crate::OutputFormat::Json => {
            let step_dur = Duration::from_secs(step_duration);
            let steps_json: Vec<serde_json::Value> = step_results
                .iter()
                .enumerate()
                .map(|(i, s)| {
                    let rps_val = min_rps + (i as u64) * step;
                    serde_json::json!({
                        "rps": rps_val,
                        "stats": s.to_json(step_dur),
                    })
                })
                .collect();
            let mut agg = crate::stat::Stats::new();
            for s in &step_results {
                agg.absorb(s);
            }
            let total_duration = Duration::from_secs(step_duration * step_results.len() as u64);
            let json = serde_json::json!({
                "steps": steps_json,
                "aggregate": agg.to_json(total_duration),
            });
            println!("{}", serde_json::to_string_pretty(&json)?);
        }
        crate::OutputFormat::Html => {
            let mut agg = crate::stat::Stats::new();
            for s in &step_results {
                agg.absorb(s);
            }
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0);
            let abs_config = std::fs::canonicalize(config_path)
                .map(|p| p.display().to_string())
                .unwrap_or_else(|_| config_path.display().to_string());
            let total_secs = step_duration * step_results.len() as u64;
            let data = crate::report::ReportData {
                config_path:   abs_config,
                generated_at:  format!("unix:{}", now),
                target_rps:    max_rps,
                duration_secs: total_secs,
                total:         agg.total(),
                passed:        agg.passed(),
                success_rate:  agg.success_rate(),
                p50:           agg.p50(),
                p95:           agg.p95(),
                p99:           agg.p99(),
                p999:          agg.p999(),
                endpoints:     crate::report::build_endpoint_rows(agg.results()),
            };
            crate::report::serve(crate::report::render(&data)).await?;
        }
    }

    {
        let mut agg = crate::stat::Stats::new();
        for s in &step_results {
            agg.absorb(s);
        }
        let abs_config = std::fs::canonicalize(config_path)
            .map(|p| p.display().to_string())
            .unwrap_or_else(|_| config_path.display().to_string());
        let record = crate::history::HistoryRecord {
            config_path:  abs_config.clone(),
            timestamp:    std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0),
            p50:          agg.p50(),
            p95:          agg.p95(),
            p99:          agg.p99(),
            p999:         agg.p999(),
            total:        agg.total(),
            success_rate: agg.success_rate(),
        };
        if let Some(prev) = crate::history::load_last(&abs_config) {
            crate::history::diff_print(&prev, &record);
        }
        let _ = crate::history::save(&record);
    }

    if !assert_flags.is_empty() {
        let mut agg = crate::stat::Stats::new();
        for s in &step_results {
            agg.absorb(s);
        }
        let assertions: Vec<crate::assertion::Assertion> = assert_flags.iter()
            .map(|s| crate::assertion::parse(s))
            .collect::<anyhow::Result<Vec<_>>>()?;
        let results = agg.evaluate(&assertions);
        let failed: Vec<_> = results.iter().filter(|r| !r.passed).collect();
        if matches!(output, crate::OutputFormat::Terminal) {
            println!();
        }
        if failed.is_empty() {
            if matches!(output, crate::OutputFormat::Terminal) {
                println!("  all assertions passed");
            }
        } else {
            for r in &failed {
                eprintln!("  ✗  {} {} {:.1} — actual: {:.1}", r.assertion.metric, r.assertion.op, r.assertion.value, r.actual);
            }
            anyhow::bail!("{} assertion(s) failed", failed.len());
        }
    }

    Ok(())
}
