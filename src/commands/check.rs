// src/commands/check.rs
use anyhow::Result;
use colored::Colorize;
use reqwest::Client;
use std::collections::HashMap;
use std::path::Path;

use crate::config::BlastConfig;
use crate::extractor;
use crate::runner;

fn evaluate_assertions(
    body: &serde_json::Value,
    rules: &std::collections::HashMap<String, String>,
) -> Vec<(String, bool, String)> {
    let mut out = Vec::new();
    for (path, expected) in rules {
        let actual_opt = crate::extractor::get_path(body, path);
        let (passed, reason) = match actual_opt {
            None => (false, format!("path \"{}\" not found", path)),
            Some(val) => {
                let actual_str = match val {
                    serde_json::Value::String(s) => s.clone(),
                    serde_json::Value::Number(n) => n.to_string(),
                    serde_json::Value::Bool(b) => b.to_string(),
                    _ => "[object]".to_string(),
                };
                if let Some(threshold_str) = expected.strip_prefix('>') {
                    let threshold: f64 = threshold_str.trim().parse().unwrap_or(0.0);
                    let actual_f: f64 = actual_str.parse().unwrap_or(f64::NEG_INFINITY);
                    (
                        actual_f > threshold,
                        format!("{} > {} (got: {})", path, threshold, actual_str),
                    )
                } else if let Some(threshold_str) = expected.strip_prefix('<') {
                    let threshold: f64 = threshold_str.trim().parse().unwrap_or(0.0);
                    let actual_f: f64 = actual_str.parse().unwrap_or(f64::INFINITY);
                    (
                        actual_f < threshold,
                        format!("{} < {} (got: {})", path, threshold, actual_str),
                    )
                } else {
                    let ok = actual_str == *expected;
                    (
                        ok,
                        format!("{} == \"{}\" (got: \"{}\")", path, expected, actual_str),
                    )
                }
            }
        };
        out.push((path.clone(), passed, reason));
    }
    out
}

pub async fn run(config_path: &Path, vars: Option<&Path>) -> Result<()> {
    let config = BlastConfig::load(config_path)?;
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .cookie_store(true)
        .build()?;

    let mut ctx: HashMap<String, String> = HashMap::new();
    if let Some(vars_path) = vars {
        let file_vars = crate::config::load_vars(vars_path)?;
        for (k, v) in file_vars {
            ctx.entry(k).or_insert(v);
        }
    }

    struct CheckResult {
        req: runner::RequestResult,
        assertion_failures: usize,
        assertion_lines: Vec<(bool, String)>,
    }

    let mut results: Vec<CheckResult> = Vec::new();

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
        if result.passed
            && let (Some(extract_rules), Some(body)) = (&endpoint.extract, &result.body)
        {
            extractor::extract(body, extract_rules, &mut ctx);
        }

        // evaluate assertions on success only
        let mut assertion_failures = 0usize;
        let mut assertion_lines: Vec<(bool, String)> = Vec::new();
        if result.passed
            && let (Some(assert_rules), Some(body)) = (&endpoint.assert, &result.body)
        {
            for (_path, passed, reason) in evaluate_assertions(body, assert_rules) {
                if !passed {
                    assertion_failures += 1;
                }
                assertion_lines.push((passed, reason));
            }
        }

        results.push(CheckResult {
            req: result,
            assertion_failures,
            assertion_lines,
        });
    }

    // ── print results ─────────────────────────────────────────────────────────
    println!();
    for cr in &results {
        let r = &cr.req;
        let endpoint_passed = r.passed && cr.assertion_failures == 0;
        if endpoint_passed {
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
            if !r.passed {
                println!(
                    "     expected {} got {}",
                    r.expected_status
                        .map(|s| s.to_string())
                        .unwrap_or("any".to_string())
                        .yellow(),
                    r.actual_status.to_string().red(),
                );
                if let Some(err) = &r.error {
                    // trim long bodies so output stays readable
                    let preview = if err.len() > 200 { &err[..200] } else { err };
                    println!("     {}", preview.dimmed());
                }
            }
        }
        // print assertion results indented under the endpoint row
        for (passed, reason) in &cr.assertion_lines {
            if *passed {
                println!("     {}  {}", "✓".green(), reason.dimmed());
            } else {
                println!("     {}  {}", "✗".red(), reason.yellow());
            }
        }
    }

    // ── summary ───────────────────────────────────────────────────────────────
    let total_assertion_failures: usize = results.iter().map(|cr| cr.assertion_failures).sum();
    let status_failed = results.iter().filter(|cr| !cr.req.passed).count();
    let failed = status_failed
        + results
            .iter()
            .filter(|cr| cr.req.passed && cr.assertion_failures > 0)
            .count();
    let passed = results.len() - failed;
    let total = results.len();

    println!();
    if failed == 0 {
        println!(
            "  {}",
            format!("{}/{} passed", passed, total).green().bold()
        );
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
        let assertion_note = if total_assertion_failures > 0 {
            format!(" ({} assertion(s) failed)", total_assertion_failures)
        } else {
            String::new()
        };
        anyhow::bail!("{} endpoint(s) failed{}", failed, assertion_note);
    }

    Ok(())
}
