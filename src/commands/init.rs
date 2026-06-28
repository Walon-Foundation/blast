use crate::config::BlastConfig;
use anyhow::Result;
use std::path::Path;

#[allow(unused)]
pub fn run(path: &Path) -> Result<()> {
    let config_path = BlastConfig::create(path)?;
    println!("created {}", config_path.display());
    println!("edit the endpoint to match your API, run run blast check");

    Ok(())
}
