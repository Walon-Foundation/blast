use crate::{config::BlastConfig, runner, stat::Stats};
use anyhow::Result;
use reqwest::Client;
use std::{
    path::Path,
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::{sync::Mutex, task::JoinHandle};

pub async fn run(config_path: &Path) -> Result<()> {
    let config = BlastConfig::load(config_path)?;

    let stages = match &config.stages {
        Some(s) if !s.is_empty() => s.clone(),
        _ => anyhow::bail!("no stages defined in blast.config.json — add a \"stages\" array"),
    };

    let client = Arc::new(
        Client::builder()
            .timeout(Duration::from_secs(30))
            .cookie_store(true)
            .build()?,
    );

    let ctx = config.load_setup(&client).await?;
    let base_url = Arc::new(config.base_url.clone());

    let endpoints = crate::config::expand_by_weight(config.endpoints_with_headers("run"));
    if endpoints.is_empty() {
        anyhow::bail!("no endpoints to run");
    }
    let endpoints = Arc::new(endpoints);

    println!();
    println!("  {:>5}   {:>8}   {:>8}   {:>6}   {:>6}   {:>6}   {:>6}", "Stage", "RPS", "Duration", "p50", "p95", "p99", "Errors");
    println!("  {}", "─".repeat(62));

    for (i, stage) in stages.iter().enumerate() {
        let stage_num = i + 1;

        if stage.rps == 0 {
            println!("  {:>5}   {:>8}   {:>7}s   cooldown", stage_num, 0, stage.duration);
            tokio::time::sleep(Duration::from_secs(stage.duration)).await;
            continue;
        }

        let interval_ms = (1000u64 / stage.rps.max(1)).max(1);
        let stage_dur = Duration::from_secs(stage.duration);
        let start_time = Instant::now();
        let mut current_idx = 0usize;
        let mut handles: Vec<JoinHandle<()>> = Vec::new();
        let mut ticker = tokio::time::interval(Duration::from_millis(interval_ms));
        let stats = Arc::new(Mutex::new(Stats::new()));

        loop {
            ticker.tick().await;

            let elapsed = start_time.elapsed();
            if elapsed >= stage_dur {
                break;
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

        let s = stats.lock().await;
        println!(
            "  {:>5}   {:>8}   {:>7}s   {:>5}ms   {:>5}ms   {:>5}ms   {}",
            stage_num,
            stage.rps,
            stage.duration,
            s.p50(),
            s.p95(),
            s.p99(),
            s.failed(),
        );
    }

    println!("  {}", "─".repeat(62));
    println!("  done");

    Ok(())
}
