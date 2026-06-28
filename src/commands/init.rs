use std::path::Path;
use anyhow::Result;
use crate::config::BlastConfig;


#[allow(unused)]
pub fn run(path: &Path) -> Result<()>{
    let config_path = BlastConfig::create(path)?;
    println!("created {}", config_path.display());
    println!("edit the endpoint to match your API, run run blast check");

    Ok(())
}