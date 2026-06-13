use std::{path::Path, sync::{Arc}, time::{Duration, Instant}};
use anyhow::Result;
use reqwest::Client;
use tokio::{sync::Mutex, task::JoinHandle};
use::colored::Colorize;
use crate::{config::BlastConfig, runner};



pub async fn run(config_path:&Path, rps: u32, duration:u64) -> Result<()> {
    let config = BlastConfig::load(config_path)?;
    let endpoints = config.endpoint_for("run");

    if endpoints.is_empty(){
        println!("No endpoint to run");
        return Ok(())
    };


    let client = Arc::new(
        Client::builder().timeout(Duration::from_secs(30)).build()?
    );


    let ctx = config.load_setup(&client).await?;
    let base_url = Arc::new(config.base_url.clone());
    let endpoints = Arc::new(
        endpoints.into_iter().cloned().collect::<Vec<_>>()
    );

    //timeout stuff
    let duration = Duration::from_secs(duration);
    let interval_ms = 1000 / rps;
    let start_time = Instant::now();
    let mut current_idx = 0;
    let mut last_print = 0u64;
    
    let results = Arc::new(Mutex::new(Vec::<runner::RequestResult>::new()));
    let mut handles:Vec<JoinHandle<()>> = Vec::new();

    let mut ticker = tokio::time::interval(Duration::from_millis(interval_ms.into()));

    loop {
        ticker.tick().await;
        
        let elapsed = start_time.elapsed();
        if elapsed >= duration {
            break;
        }

        let elapsed_secs = elapsed.as_secs();
        if elapsed_secs > last_print {
            last_print = elapsed_secs;
            let r = results.lock().await;
            let total   = r.len();
            let success = r.iter().filter(|r| r.passed).count();
            let mut latencies: Vec<u128> = r.iter().map(|r| r.latency_ms).collect();
            latencies.sort_unstable();
            let p99 = percentile(&latencies, 99);
            drop(r);
            println!(
                "  elapsed: {}s   sent: {}   success: {}   p99: {}ms",
                elapsed_secs, total, success, p99
            );
        }

        let endpoint = endpoints[current_idx % endpoints.len()].clone();
        current_idx += 1;

        let client = Arc::clone(&client);
        let base_url = Arc::clone(&base_url);
        let ctx = ctx.clone();
        let results = Arc::clone(&results);

        let handle = tokio::spawn(async move {
            let result = runner::execute(&client, &endpoint, &base_url, &ctx).await;
            results.lock().await.push(result);
        });

        handles.push(handle);
    }

    for handle in handles {
        handle.await?;
    }

    let results   = results.lock().await;
    let total     = results.len();
    let passed    = results.iter().filter(|r| r.passed).count();
    let failed    = total - passed;
    let mut latencies: Vec<u128> = results.iter().map(|r| r.latency_ms).collect();
    latencies.sort_unstable();

    println!();
    println!("  Total requests:  {}", total);
    println!("  Duration:        {:?}s", duration);
    // println!("  Req/sec:         {:.1}", total as f64 / duration);
    println!(
        "  Success rate:    {}",
        format!("{:.1}%", (passed as f64 / total as f64) * 100.0)
            .green()
    );
    println!();
    println!("  Latency");
    println!("    p50:   {}ms", percentile(&latencies, 50));
    println!("    p95:   {}ms", percentile(&latencies, 95));
    println!("    p99:   {}ms", percentile(&latencies, 99));
    println!("    p999:  {}ms", percentile(&latencies, 999));
    println!();
    if failed > 0 {
        println!("  Errors: {}", failed.to_string().red());
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