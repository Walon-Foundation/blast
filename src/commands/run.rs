use crate::{config::BlastConfig, runner, stat::Stats};
use anyhow::Result;
use reqwest::Client;
use std::{
    path::Path,
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::{sync::Mutex, task::JoinHandle};

pub async fn run(
    config_path: &Path,
    rps: u32,
    duration: u64,
    ramp_up: u64,
    vars: Option<&std::path::Path>,
    assert_flags: Vec<String>,
    output: crate::OutputFormat,
) -> Result<()> {
    let config = BlastConfig::load(config_path)?;

    let client = Arc::new(
        Client::builder()
            .timeout(Duration::from_secs(30))
            .cookie_store(true)
            .build()?,
    );

    let mut ctx = config.load_setup(&client).await?;
    if let Some(vars_path) = vars {
        let file_vars = crate::config::load_vars(vars_path)?;
        for (k, v) in file_vars {
            ctx.entry(k).or_insert(v);
        }
    }
    let base_url = Arc::new(config.base_url.clone());

    let scenarios = config.scenarios();

    if !scenarios.is_empty() {
        // Scenario mode: each spawned task runs one full scenario sequence in order,
        // with a local extraction context so extracted values flow between steps.
        let scenario_list: Vec<Vec<crate::config::Endpoint>> = scenarios.into_values().collect();
        let scenario_count = scenario_list.len();
        let scenario_list = Arc::new(scenario_list);

        if rps == 0 {
            anyhow::bail!("rps must be at least 1");
        }

        if ramp_up > 0 {
            println!("  ramping up — {}s", ramp_up);
            let ramp_end = Instant::now() + Duration::from_secs(ramp_up);
            let mut ramp_idx: usize = 0;
            let mut ramp_handles = Vec::new();

            while Instant::now() < ramp_end {
                let elapsed_secs = ramp_up
                    .saturating_sub(ramp_end.saturating_duration_since(Instant::now()).as_secs());
                let fraction = (elapsed_secs as f64 / ramp_up as f64).min(1.0);
                let current_rps = ((fraction * rps as f64).max(1.0)) as u64;
                let interval_ms = (1000u64 / current_rps).max(1);

                let client_c = Arc::clone(&client);
                let scenario = scenario_list[ramp_idx % scenario_count].clone();
                let base = Arc::clone(&base_url);
                let ctx_snap = ctx.clone();
                ramp_handles.push(tokio::spawn(async move {
                    let mut local_ctx = ctx_snap;
                    for ep in &scenario {
                        let result = runner::execute(&client_c, ep, &base, &local_ctx).await;
                        if result.passed
                            && let (Some(rules), Some(body)) = (&ep.extract, &result.body)
                        {
                            crate::extractor::extract(body, rules, &mut local_ctx);
                        }
                    }
                }));
                ramp_idx = ramp_idx.wrapping_add(1);

                tokio::time::sleep(Duration::from_millis(interval_ms)).await;
            }

            for h in ramp_handles {
                let _ = h.await;
            }
            println!("  ramp-up complete — measuring at {} req/s", rps);
        }

        let duration = Duration::from_secs(duration);
        let interval_ms = (1000u32 / rps).max(1);
        let start_time = Instant::now();
        let mut current_idx = 0;
        let mut last_print = 0u64;
        let mut handles: Vec<JoinHandle<()>> = Vec::new();
        let mut ticker = tokio::time::interval(Duration::from_millis(interval_ms.into()));
        let stats = Arc::new(Mutex::new(Stats::new()));

        loop {
            ticker.tick().await;

            let elapsed = start_time.elapsed();
            if elapsed >= duration {
                break;
            }

            let elapsed_secs = elapsed.as_secs();
            if elapsed_secs > last_print {
                last_print = elapsed_secs;
                if matches!(output, crate::OutputFormat::Terminal) {
                    stats.lock().await.print_progress(elapsed_secs);
                }
            }

            let scenario = scenario_list[current_idx % scenario_count].clone();
            current_idx += 1;

            let client = Arc::clone(&client);
            let base_url = Arc::clone(&base_url);
            let ctx_snap = ctx.clone();
            let stats = Arc::clone(&stats);

            let handle = tokio::spawn(async move {
                let mut local_ctx = ctx_snap;
                for ep in &scenario {
                    let result = runner::execute(&client, ep, &base_url, &local_ctx).await;
                    if result.passed
                        && let (Some(rules), Some(body)) = (&ep.extract, &result.body)
                    {
                        crate::extractor::extract(body, rules, &mut local_ctx);
                    }
                    stats.lock().await.record(result);
                }
            });

            handles.push(handle);
        }

        for handle in handles {
            handle.await?;
        }

        let stats_guard = stats.lock().await;
        match &output {
            crate::OutputFormat::Terminal => stats_guard.print_summary(duration),
            crate::OutputFormat::Json => {
                println!(
                    "{}",
                    serde_json::to_string_pretty(&stats_guard.to_json(duration))?
                );
            }
            crate::OutputFormat::Html => {
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_secs())
                    .unwrap_or(0);
                let abs_config = std::fs::canonicalize(config_path)
                    .map(|p| p.display().to_string())
                    .unwrap_or_else(|_| config_path.display().to_string());
                let data = crate::report::ReportData {
                    config_path: abs_config,
                    generated_at: format!("unix:{}", now),
                    target_rps: rps as u64,
                    duration_secs: duration.as_secs(),
                    total: stats_guard.total(),
                    passed: stats_guard.passed(),
                    success_rate: stats_guard.success_rate(),
                    p50: stats_guard.p50(),
                    p95: stats_guard.p95(),
                    p99: stats_guard.p99(),
                    p999: stats_guard.p999(),
                    endpoints: crate::report::build_endpoint_rows(stats_guard.results()),
                };
                crate::report::serve(crate::report::render(&data)).await?;
            }
        }

        let abs_config = std::fs::canonicalize(config_path)
            .map(|p| p.display().to_string())
            .unwrap_or_else(|_| config_path.display().to_string());
        let record = crate::history::HistoryRecord {
            config_path: abs_config.clone(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0),
            p50: stats_guard.p50(),
            p95: stats_guard.p95(),
            p99: stats_guard.p99(),
            p999: stats_guard.p999(),
            total: stats_guard.total(),
            success_rate: stats_guard.success_rate(),
        };
        if let Some(prev) = crate::history::load_last(&abs_config) {
            crate::history::diff_print(&prev, &record);
        }
        let _ = crate::history::save(&record);

        if !assert_flags.is_empty() {
            let assertions: Vec<crate::assertion::Assertion> = assert_flags
                .iter()
                .map(|s| crate::assertion::parse(s))
                .collect::<anyhow::Result<Vec<_>>>()?;
            let results = stats_guard.evaluate(&assertions);
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
                    eprintln!("  ✗  {} (actual: {:.1})", r.assertion.raw, r.actual);
                }
                anyhow::bail!("{} assertion(s) failed", failed.len());
            }
        }
    } else {
        // Existing round-robin path — no change
        let endpoints = crate::config::expand_by_weight(config.endpoints_with_headers("run"));

        if endpoints.is_empty() {
            println!("No endpoint to run");
            return Ok(());
        };

        let endpoints = Arc::new(endpoints);

        if rps == 0 {
            anyhow::bail!("rps must be at least 1");
        }

        if ramp_up > 0 {
            println!("  ramping up — {}s", ramp_up);
            let ramp_end = Instant::now() + Duration::from_secs(ramp_up);
            let mut ramp_idx: usize = 0;
            let mut ramp_handles = Vec::new();

            while Instant::now() < ramp_end {
                let elapsed_secs = ramp_up
                    .saturating_sub(ramp_end.saturating_duration_since(Instant::now()).as_secs());
                let fraction = (elapsed_secs as f64 / ramp_up as f64).min(1.0);
                let current_rps = ((fraction * rps as f64).max(1.0)) as u64;
                let interval_ms = (1000u64 / current_rps).max(1);

                let client_c = Arc::clone(&client);
                let ep = endpoints[ramp_idx % endpoints.len()].clone();
                let base = Arc::clone(&base_url);
                let ctx_snap = ctx.clone();
                ramp_handles.push(tokio::spawn(async move {
                    let _ = runner::execute(&client_c, &ep, &base, &ctx_snap).await;
                }));
                ramp_idx = ramp_idx.wrapping_add(1);

                tokio::time::sleep(Duration::from_millis(interval_ms)).await;
            }

            for h in ramp_handles {
                let _ = h.await;
            }
            println!("  ramp-up complete — measuring at {} req/s", rps);
        }

        let duration = Duration::from_secs(duration);
        let interval_ms = (1000u32 / rps).max(1);
        let start_time = Instant::now();
        let mut current_idx = 0;
        let mut last_print = 0u64;
        let mut handles: Vec<JoinHandle<()>> = Vec::new();
        let mut ticker = tokio::time::interval(Duration::from_millis(interval_ms.into()));
        let stats = Arc::new(Mutex::new(Stats::new()));

        loop {
            ticker.tick().await;

            let elapsed = start_time.elapsed();
            if elapsed >= duration {
                break;
            }

            let elapsed_secs = elapsed.as_secs();
            if elapsed_secs > last_print {
                last_print = elapsed_secs;
                if matches!(output, crate::OutputFormat::Terminal) {
                    stats.lock().await.print_progress(elapsed_secs);
                }
            }

            let endpoint = endpoints[current_idx % endpoints.len()].clone();
            current_idx += 1;

            let client = Arc::clone(&client);
            let base_url = Arc::clone(&base_url);
            let ctx = ctx.clone();
            let stats = Arc::clone(&stats);

            let handle = tokio::spawn(async move {
                let result = runner::execute(&client, &endpoint, &base_url, &ctx).await;
                stats.lock().await.record(result);
            });

            handles.push(handle);
        }

        for handle in handles {
            handle.await?;
        }

        let stats_guard = stats.lock().await;
        match &output {
            crate::OutputFormat::Terminal => stats_guard.print_summary(duration),
            crate::OutputFormat::Json => {
                println!(
                    "{}",
                    serde_json::to_string_pretty(&stats_guard.to_json(duration))?
                );
            }
            crate::OutputFormat::Html => {
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_secs())
                    .unwrap_or(0);
                let abs_config = std::fs::canonicalize(config_path)
                    .map(|p| p.display().to_string())
                    .unwrap_or_else(|_| config_path.display().to_string());
                let data = crate::report::ReportData {
                    config_path: abs_config,
                    generated_at: format!("unix:{}", now),
                    target_rps: rps as u64,
                    duration_secs: duration.as_secs(),
                    total: stats_guard.total(),
                    passed: stats_guard.passed(),
                    success_rate: stats_guard.success_rate(),
                    p50: stats_guard.p50(),
                    p95: stats_guard.p95(),
                    p99: stats_guard.p99(),
                    p999: stats_guard.p999(),
                    endpoints: crate::report::build_endpoint_rows(stats_guard.results()),
                };
                crate::report::serve(crate::report::render(&data)).await?;
            }
        }

        let abs_config = std::fs::canonicalize(config_path)
            .map(|p| p.display().to_string())
            .unwrap_or_else(|_| config_path.display().to_string());
        let record = crate::history::HistoryRecord {
            config_path: abs_config.clone(),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0),
            p50: stats_guard.p50(),
            p95: stats_guard.p95(),
            p99: stats_guard.p99(),
            p999: stats_guard.p999(),
            total: stats_guard.total(),
            success_rate: stats_guard.success_rate(),
        };
        if let Some(prev) = crate::history::load_last(&abs_config) {
            crate::history::diff_print(&prev, &record);
        }
        let _ = crate::history::save(&record);

        if !assert_flags.is_empty() {
            let assertions: Vec<crate::assertion::Assertion> = assert_flags
                .iter()
                .map(|s| crate::assertion::parse(s))
                .collect::<anyhow::Result<Vec<_>>>()?;
            let results = stats_guard.evaluate(&assertions);
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
                    eprintln!("  ✗  {} (actual: {:.1})", r.assertion.raw, r.actual);
                }
                anyhow::bail!("{} assertion(s) failed", failed.len());
            }
        }
    }

    Ok(())
}
