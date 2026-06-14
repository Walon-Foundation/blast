use std::{path::Path, sync::Arc, time::{Duration, Instant}};
use anyhow::Result;
use reqwest::Client;
use tokio::{sync::Mutex, task::JoinHandle};
use crate::{config::{BlastConfig}, runner};
use colored::Colorize;

#[allow(unused)]
struct StepResult {
    rps: u64,
    total: usize,
    passed: usize,
    failed: usize,
    p50: u128,
    p95: u128,
    p99: u128,
    error_rate: f64,
    breaking: bool
}

pub async fn run(config_path:&Path, min_rps:u64, max_rps:u64, step:u64, step_duration:u64) -> Result<()>{
    let config = BlastConfig::load(&config_path)?;
    let endpoints = config.endpoint_for("stress");
    if endpoints.is_empty() {
        println!("{}", "no endpoints tagged \"stress\" found".yellow());
        return Ok(());
    }
    
    let client = Arc::new(
        Client::builder().timeout(Duration::from_secs(30)).build()?
    );

    let endpoints = Arc::new(
        endpoints.into_iter().cloned().collect::<Vec<_>>()
    );
    
    let ctx = config.load_setup(&client).await?;
    let base_url = Arc::new(config.base_url.clone());
    let mut step_results = Vec::<StepResult>::new();
    let mut current_rps = min_rps;
    let step_duration = Duration::from_secs(step_duration);

    while current_rps <= max_rps {
        println!("\n -> step {current_rps} req/s for {:?}s",step_duration.as_secs());

        let interval_ms = 1000/current_rps;
        let start_time = Instant::now();
        let mut current_idx = 0;
        
        let http_result = Arc::new(Mutex::new(Vec::<runner::RequestResult>::new()));
        let mut handles:Vec<JoinHandle<()>> = Vec::new();
        let mut ticker = tokio::time::interval(Duration::from_millis(interval_ms));

        loop {
            ticker.tick().await;
            
            let elapsed = start_time.elapsed();
            if elapsed >= step_duration {
                break;
            }

            let endpoint = endpoints[current_idx % endpoints.len()].clone();
            current_idx += 1;

            let client = Arc::clone(&client);
            let base_url = Arc::clone(&base_url);
            let ctx = ctx.clone();
            let http_result = Arc::clone(&http_result);

            let handle = tokio::spawn(async move {
                let result = runner::execute(&client, &endpoint, &base_url, &ctx).await;
                http_result.lock().await.push(result);
            });

            handles.push(handle);
        };

        for handle in handles {
            handle.await?;
        };

        let result = http_result.lock().await;
        let total = result.len();
        let passed = result.iter().filter(|r| r.passed ).count();
        let failed = total - passed;
        
        let error_rate = if total == 0 {
            0.0
        } else {
            (failed as f64 / total as f64) * 100.0
        };
        
        let mut latencies: Vec<u128> = result.iter().map(|r| r.latency_ms).collect();
        drop(result);
        
        latencies.sort_unstable();
        
        let p50 = percentile(&latencies, 50);
        let p95 = percentile(&latencies, 95);
        let p99 = percentile(&latencies, 99);
        
        let breaking = p99 > 500 || error_rate > 1.0;

        // print step row
        let row = format!(
            "  {:>5} req/s   {:>6} req   {:>6.1}%   p50: {:>5}ms   p99: {:>5}ms   errors: {}",
            current_rps, total,
            (passed as f64 / total as f64) * 100.0,
            p50, p99, failed
        );
        if breaking {
            println!("{} {}", row.red(), "⚠".red().bold());
        } else {
            println!("{}", row.green());
        }
        
        step_results.push(StepResult { 
            rps: current_rps, 
            total, 
            passed, 
            failed, 
            p50, 
            p95, 
            p99, 
            error_rate, 
            breaking 
        });

        if breaking {
            println!(
                "\n{}",
                format!("⚠ breaking point at {} req/s", current_rps).red().bold()
            );
            println!("  p99:        {}ms", p99);
            println!("  error rate: {:.1}%", error_rate);
            break;
        }

        current_rps += step;
    };

    // print the summary result
    println!("\n{}", "─".repeat(70));
    println!(
        "  {:<8} {:<10} {:<10} {:<8} {:<8} {:<8} {:<8}",
        "RPS", "Requests", "Success", "p50", "p95", "p99", "Errors"
    );
    println!("{}", "─".repeat(70));

    for sr in &step_results {
        let row = format!(
            "  {:<8} {:<10} {:<10} {:<8} {:<8} {:<8} {:<8}",
            sr.rps,
            sr.total,
            format!("{:.1}%", (sr.passed as f64 / sr.total as f64) * 100.0),
            format!("{}ms", sr.p50),
            format!("{}ms", sr.p95),
            format!("{}ms", sr.p99),
            sr.failed,
        );
        if sr.breaking {
            println!("{} ⚠", row.red());
        } else {
            println!("{}", row);
        }
    }
    println!("{}", "─".repeat(70));

    let found_breaking = step_results.iter().any(|r| r.breaking);
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

fn percentile(sorted: &[u128], p: usize) -> u128 {
    if sorted.is_empty() {
        return 0;
    }
    let index = ((p as f64 / 100.0) * sorted.len() as f64) as usize;
    let index = index.min(sorted.len() - 1);
    sorted[index]
}