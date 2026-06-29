use anyhow::{Context, Result};
use std::path::Path;

pub async fn run(config_path: &Path, name: &str) -> Result<()> {
    let config = crate::config::BlastConfig::load(config_path)?;

    let endpoint = config
        .endpoints
        .iter()
        .chain(config.setup.iter().flatten())
        .find(|e| e.name == name)
        .with_context(|| format!("no endpoint named \"{}\"", name))?
        .clone();

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .cookie_store(true)
        .build()?;

    let ctx = config.load_setup(&client).await?;
    let detail = crate::runner::execute_traced(&client, &endpoint, &config.base_url, &ctx).await;

    println!();
    println!("── request ─────────────────────────────────────");
    println!("{} {}", detail.method, detail.url);
    for (k, v) in &detail.request_headers {
        println!("  {}: {}", k, v);
    }
    if let Some(body) = &detail.request_body {
        println!("{}", serde_json::to_string_pretty(body).unwrap_or_default());
    }

    let status_line = if detail.passed {
        format!("{} ✓", detail.response_status)
    } else {
        format!("{} ✗", detail.response_status)
    };
    println!();
    println!(
        "── response ({} — {}ms) ─────────────────────────",
        status_line, detail.latency_ms
    );
    for (k, v) in &detail.response_headers {
        println!("  {}: {}", k, v);
    }
    if let Some(body) = &detail.response_body {
        println!("{}", serde_json::to_string_pretty(body).unwrap_or_default());
    }
    println!();

    Ok(())
}
