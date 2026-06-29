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

    let ctx = config.load_setup(&client).await?;
    let base_url = Arc::new(config.base_url.clone());
    let mut step_results = Vec::<Stats>::new();
    let mut current_rps = min_rps;
    let step_dur = Duration::from_secs(step_duration);

    while current_rps <= max_rps {
        println!("\n -> step {current_rps} req/s for {}s", step_dur.as_secs());

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

        let breaking = step_stats.print_step(current_rps);
        step_results.push(step_stats);

        if breaking {
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
            break;
        }

        current_rps += step;
    }

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

    Ok(())
}
