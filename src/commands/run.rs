use crate::{config::BlastConfig, runner, stat::Stats};
use anyhow::Result;
use reqwest::Client;
use std::{
    path::Path,
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::{sync::Mutex, task::JoinHandle};

pub async fn run(config_path: &Path, rps: u32, duration: u64, ramp_up: u64, vars: Option<&std::path::Path>) -> Result<()> {
    let config = BlastConfig::load(config_path)?;
    let endpoints = crate::config::expand_by_weight(config.endpoints_with_headers("run"));

    if endpoints.is_empty() {
        println!("No endpoint to run");
        return Ok(());
    };

    let client = Arc::new(Client::builder().timeout(Duration::from_secs(30)).cookie_store(true).build()?);

    let mut ctx = config.load_setup(&client).await?;
    if let Some(vars_path) = vars {
        let file_vars = crate::config::load_vars(vars_path)?;
        for (k, v) in file_vars {
            ctx.entry(k).or_insert(v);
        }
    }
    let base_url = Arc::new(config.base_url.clone());
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
            let elapsed_secs = ramp_up.saturating_sub(
                ramp_end.saturating_duration_since(Instant::now()).as_secs()
            );
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

        for h in ramp_handles { let _ = h.await; }
        println!("  ramp-up complete — measuring at {} req/s", rps);
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
