use std::{collections::HashMap, path::Path, sync::Arc, time::Duration};

use anyhow::Result;
use colored::Colorize;
use reqwest::Client;
use tokio::{
    sync::{Mutex, Semaphore},
    task::JoinHandle,
};

use crate::{config::BlastConfig, extractor, runner};

struct IterationResult {
    passed: bool,
    requests: usize,
}

pub async fn run(config_path: &Path, count: u32, concurrency: usize, vars: Option<&std::path::Path>) -> Result<()> {
    let config = BlastConfig::load(config_path)?;
    let endpoints = crate::config::expand_by_weight(config.endpoints_with_headers("seed"));

    if endpoints.is_empty() {
        println!(
            "{}",
            "no endpoints tagged \"seed\" found in blast.config.json".yellow()
        );
        println!("add \"tags\": [\"seed\"] to the endpoints you want to seed with");
        return Ok(());
    }

    let client = Arc::new(Client::builder().timeout(Duration::from_secs(10)).cookie_store(true).build()?);

    let file_vars: Arc<HashMap<String, String>> = Arc::new(if let Some(vars_path) = vars {
        crate::config::load_vars(vars_path)?
    } else {
        HashMap::new()
    });

    //each tasks need to own endpoint
    let endpoints = Arc::new(endpoints);

    let base_url = Arc::new(config.base_url);
    let results = Arc::new(Mutex::new(Vec::<IterationResult>::new()));
    let semaphore = Arc::new(Semaphore::new(concurrency));

    println!(
        "seeding {} iterations × {} endpoints (concurrency: {})\n",
        count,
        endpoints.len(),
        concurrency,
    );

    let mut handles: Vec<JoinHandle<()>> = Vec::new();

    for _ in 0..count {
        let client = Arc::clone(&client);
        let base_url = Arc::clone(&base_url);
        let endpoints = Arc::clone(&endpoints);
        let semaphore = Arc::clone(&semaphore);
        let results = Arc::clone(&results);
        let file_vars = Arc::clone(&file_vars);

        let handle = tokio::spawn(async move {
            let _permit = semaphore.acquire_owned().await.unwrap();

            // seed ctx with vars at lowest priority; extractions will override
            let mut ctx: HashMap<String, String> = (*file_vars).clone();
            let mut iteration_passed = true;

            for endpoint in endpoints.iter() {
                let result = runner::execute(&client, endpoint, &base_url, &ctx).await;

                if result.passed {
                    if let (Some(rules), Some(body)) = (&endpoint.extract, &result.body) {
                        extractor::extract(body, rules, &mut ctx);
                    }
                } else {
                    iteration_passed = false;
                }
            }

            results.lock().await.push(IterationResult {
                passed: iteration_passed,
                requests: endpoints.len(),
            });
        });

        handles.push(handle);
    }

    for handle in handles {
        handle.await?
    }

    let results = results.lock().await;
    let total = results.len();
    let passed = results.iter().filter(|r| r.passed).count();
    let failed = total - passed;
    let total_requests: usize = results.iter().map(|r| r.requests).sum();

    println!();
    println!("  Iterations:      {}", total);
    println!("  Passed:          {}", passed.to_string().green());
    if failed > 0 {
        println!("  Failed:          {}", failed.to_string().red());
    }
    println!("  Total requests:  {}", total_requests);
    println!();

    if failed > 0 {
        println!(
            "{}",
            format!(
                "{} iteration(s) failed — run blast check to diagnose",
                failed
            )
            .yellow()
        );
    } else {
        println!("{}", "all iterations passed".green().bold());
    }

    Ok(())
}
