use crate::{config::BlastConfig, runner, stat::Stats};
use anyhow::Result;
use reqwest::Client;
use std::{
    path::Path,
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::{sync::Mutex, task::JoinHandle};

pub async fn run(config_path: &Path, rps: u32, duration: u64) -> Result<()> {
    let config = BlastConfig::load(config_path)?;
    let endpoints = config.endpoints_with_headers("run");

    if endpoints.is_empty() {
        println!("No endpoint to run");
        return Ok(());
    };

    let client = Arc::new(Client::builder().timeout(Duration::from_secs(30)).cookie_store(true).build()?);

    let ctx = config.load_setup(&client).await?;
    let base_url = Arc::new(config.base_url.clone());
    let endpoints = Arc::new(endpoints);

    if rps == 0 {
        anyhow::bail!("rps must be at least 1");
    }

    //timeout stuff
    let duration = Duration::from_secs(duration);
    let interval_ms = (1000u32 / rps).max(1);
    let start_time = Instant::now();
    let mut current_idx = 0;
    let mut last_print = 0u64;

    // let results = Arc::new(Mutex::new(Vec::<runner::RequestResult>::new()));
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
            stats.lock().await.print_progress(elapsed_secs);
        }

        let endpoint = endpoints[current_idx % endpoints.len()].clone();
        current_idx += 1;

        let client = Arc::clone(&client);
        let base_url = Arc::clone(&base_url);
        let ctx = ctx.clone();
        // let results = Arc::clone(&results);
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

    stats.lock().await.print_summary(duration);

    Ok(())
}
