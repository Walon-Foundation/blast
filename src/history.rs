use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};

#[derive(Debug, Serialize, Deserialize)]
pub struct HistoryRecord {
    pub config_path: String,
    pub timestamp: u64,
    pub p50: u128,
    pub p95: u128,
    pub p99: u128,
    pub p999: u128,
    pub total: usize,
    pub success_rate: f64,
}

fn history_dir() -> Option<PathBuf> {
    dirs::home_dir().map(|h| h.join(".blast").join("history"))
}

fn path_hash(config_path: &str) -> String {
    let mut h: u64 = 5381;
    for b in config_path.bytes() {
        h = h.wrapping_mul(33).wrapping_add(b as u64);
    }
    format!("{:08x}", h & 0xffff_ffff)
}

pub fn save(record: &HistoryRecord) -> Result<()> {
    let dir = match history_dir() {
        Some(d) => d,
        None => return Ok(()),
    };
    fs::create_dir_all(&dir)?;
    let name = format!(
        "{}_{}.json",
        record.timestamp,
        path_hash(&record.config_path)
    );
    fs::write(dir.join(name), serde_json::to_string(record)?)?;
    Ok(())
}

pub fn load_last(config_path: &str) -> Option<HistoryRecord> {
    let dir = history_dir()?;
    let hash = path_hash(config_path);
    let mut records: Vec<HistoryRecord> = fs::read_dir(&dir)
        .ok()?
        .filter_map(|e| e.ok())
        .filter(|e| e.file_name().to_string_lossy().contains(&hash))
        .filter_map(|e| {
            fs::read_to_string(e.path())
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
        })
        .collect();
    records.sort_by_key(|r| r.timestamp);
    records.into_iter().last()
}

pub fn diff_print(prev: &HistoryRecord, curr: &HistoryRecord) {
    println!("  vs last run:");
    for (label, pv, cv) in [
        ("p50", prev.p50 as f64, curr.p50 as f64),
        ("p95", prev.p95 as f64, curr.p95 as f64),
        ("p99", prev.p99 as f64, curr.p99 as f64),
        ("p999", prev.p999 as f64, curr.p999 as f64),
    ] {
        if pv == 0.0 {
            continue;
        }
        let pct = (cv - pv) / pv * 100.0;
        let arrow = if pct > 5.0 {
            "▲"
        } else if pct < -5.0 {
            "▼"
        } else {
            "→"
        };
        println!(
            "    {}  {}ms → {}ms ({:+.0}%) {}",
            label, pv as u128, cv as u128, pct, arrow
        );
    }
}
