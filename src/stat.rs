use ::colored::Colorize;
use std::time::Duration;

use crate::runner::RequestResult;

#[derive(Debug)]
pub struct Stats {
    results: Vec<RequestResult>,
}

impl Stats {
    pub fn new() -> Self {
        Stats {
            results: Vec::new(),
        }
    }

    pub fn record(&mut self, result: RequestResult) {
        self.results.push(result);
    }

    pub fn total(&self) -> usize {
        self.results.len()
    }

    pub fn passed(&self) -> usize {
        self.results.iter().filter(|r| r.passed).count()
    }

    pub fn failed(&self) -> usize {
        self.total() - self.passed()
    }

    pub fn success_rate(&self) -> f64 {
        if self.total() == 0 {
            return 0.0;
        }

        (self.passed() as f64 / self.total() as f64) * 100.0
    }

    pub fn error_rate(&self) -> f64 {
        100.0 - self.success_rate()
    }

    pub fn percentile(&self, p: usize) -> u128 {
        let sorted = self.sorted_latencies();
        if sorted.is_empty() {
            return 0;
        }

        let index = ((p as f64 / 1000.0) * sorted.len() as f64) as usize;
        sorted[index.min(sorted.len() - 1)]
    }

    pub fn p50(&self) -> u128 {
        self.percentile(500)
    }
    pub fn p95(&self) -> u128 {
        self.percentile(950)
    }
    pub fn p99(&self) -> u128 {
        self.percentile(990)
    }
    pub fn p999(&self) -> u128 {
        self.percentile(999)
    }

    pub fn print_summary(&self, duration: Duration) {
        let (p50, p95, p99, p999) = self.summary_percentiles();
        println!();
        println!("  Total requests:  {}", self.total());
        println!("  Duration:        {:?}s", duration);
        // println!("  Req/sec:         {:.1}", total as f64 / duration);
        println!(
            "  Success rate:    {}",
            format!("{:.1}%", self.success_rate()).green()
        );
        println!();
        println!("  Latency");
        println!("    p50:   {}ms", p50);
        println!("    p95:   {}ms", p95);
        println!("    p99:   {}ms", p99);
        println!("    p999:  {}ms", p999);
        println!();
        if self.failed() > 0 {
            println!("  Errors: {}", self.failed().to_string().red());
        }
    }

    pub fn print_step(&self, rps: u64) -> bool {
        let (p50, _p95, p99, _p999) = self.summary_percentiles();
        let breaking = p99 > 500 || self.error_rate() > 1.0;

        // print step row
        let row = format!(
            "  {:>5} req/s   {:>6} req   {:>6.1}%   p50: {:>5}ms   p99: {:>5}ms   errors: {}",
            rps,
            self.total(),
            format!("{:.1}%", self.success_rate()),
            p50,
            p99,
            self.failed()
        );
        if breaking {
            println!("{} {}", row.red(), "⚠".red().bold());
            return true;
        }

        println!("{}", row.green());
        false
    }

    pub fn print_progress(&self, elapsed_time: u64) {
        println!(
            "  elapsed: {}s   sent: {}   success: {}   p99: {}ms",
            elapsed_time,
            self.total(),
            self.success_rate(),
            self.p99()
        )
    }
}

impl Stats {
    fn sorted_latencies(&self) -> Vec<u128> {
        let mut v: Vec<u128> = self.results.iter().map(|r| r.latency_ms).collect();
        v.sort_unstable();
        v
    }

    pub fn absorb(&mut self, other: &Stats) {
        self.results.extend(other.results.iter().cloned());
    }

    pub fn evaluate(&self, assertions: &[crate::assertion::Assertion]) -> Vec<crate::assertion::AssertionResult> {
        use crate::assertion::{Metric, Op, AssertionResult};
        assertions.iter().map(|a| {
            let actual = match &a.metric {
                Metric::P50         => self.p50()  as f64,
                Metric::P95         => self.p95()  as f64,
                Metric::P99         => self.p99()  as f64,
                Metric::P999        => self.p999() as f64,
                Metric::ErrorRate   => self.error_rate(),
                Metric::SuccessRate => self.success_rate(),
            };
            let passed = match &a.op {
                Op::Lt  => actual <  a.value,
                Op::Lte => actual <= a.value,
                Op::Gt  => actual >  a.value,
                Op::Gte => actual >= a.value,
            };
            AssertionResult { assertion: a.clone(), actual, passed }
        }).collect()
    }

    fn summary_percentiles(&self) -> (u128, u128, u128, u128) {
        let sorted = self.sorted_latencies();
        if sorted.is_empty() {
            return (0, 0, 0, 0);
        }
        let len = sorted.len();
        let pick = |p: usize| -> u128 {
            let index = ((p as f64 / 1000.0) * len as f64) as usize;
            sorted[index.min(len - 1)]
        };
        (pick(500), pick(950), pick(990), pick(999))
    }
}
