// src/commands/check.rs
use std::path::Path;
use std::collections::HashMap;
use anyhow::Result;
use colored::Colorize;
use reqwest::Client;

use crate::config::BlastConfig;
use crate::runner;
use crate::extractor;

pub async fn run(config_path: &Path) -> Result<()> {
    let config = BlastConfig::load(config_path)?;
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

    let mut ctx:     HashMap<String, String> = HashMap::new();
    let mut results: Vec<runner::RequestResult> = Vec::new();

    for endpoint in &config.endpoints {

        let mut merged_endpoint = endpoint.clone();
        if let Some(global) = &config.headers {
            let mut merged = global.clone();
            if let Some(ep_headers) = &endpoint.headers {
                merged.extend(ep_headers.clone()); 
            }
            merged_endpoint.headers = Some(merged);
        }

        // send the request
        let result = runner::execute(&client, &merged_endpoint, &config.base_url, &ctx).await;

        // extract variables on success only
        if result.passed {
            if let (Some(extract_rules), Some(body)) = (&endpoint.extract, &result.body) {
                extractor::extract(body, extract_rules, &mut ctx);
            }
        }

        results.push(result);
    }

    // ── print results ─────────────────────────────────────────────────────────
    println!();
    for r in &results {
        if r.passed {
            println!(
                "  {}  {:<30}  {} {}  {}ms",
                "✓".green().bold(),
                r.endpoint_name.as_str(),
                r.method.cyan(),
                r.path.dimmed(),
                r.latency_ms,
            );
        } else {
            println!(
                "  {}  {:<30}  {} {}  {}ms",
                "✗".red().bold(),
                r.endpoint_name.as_str(),
                r.method.cyan(),
                r.path.dimmed(),
                r.latency_ms,
            );
            println!(
                "     expected {} got {}",
                r.expected_status.map(|s| s.to_string()).unwrap_or("any".to_string()).yellow(),
                r.actual_status.to_string().red(),
            );
            if let Some(err) = &r.error {
                // trim long bodies so output stays readable
                let preview = if err.len() > 200 { &err[..200] } else { err };
                println!("     {}", preview.dimmed());
            }
        }
    }

    // ── summary ───────────────────────────────────────────────────────────────
    let passed  = results.iter().filter(|r| r.passed).count();
    let failed  = results.iter().filter(|r| !r.passed).count();
    let total   = results.len();

    println!();
    if failed == 0 {
        println!("  {}", format!("{}/{} passed", passed, total).green().bold());
    } else {
        println!(
            "  {}  —  {}",
            format!("{}/{} passed", passed, total).yellow().bold(),
            format!("{} failed", failed).red().bold(),
        );
    }
    println!();

    // non-zero exit if any failed — CI friendly
    if failed > 0 {
        anyhow::bail!("{} endpoint(s) failed", failed);
    }

    Ok(())
}