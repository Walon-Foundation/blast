use anyhow::{Result, bail};

#[derive(Debug, Clone)]
pub enum Metric {
    P50,
    P95,
    P99,
    P999,
    ErrorRate,
    SuccessRate,
}

impl std::fmt::Display for Metric {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::P50 => write!(f, "p50"),
            Self::P95 => write!(f, "p95"),
            Self::P99 => write!(f, "p99"),
            Self::P999 => write!(f, "p999"),
            Self::ErrorRate => write!(f, "error-rate"),
            Self::SuccessRate => write!(f, "success-rate"),
        }
    }
}

#[derive(Debug, Clone)]
pub enum Op {
    Lt,
    Lte,
    Gt,
    Gte,
}

impl std::fmt::Display for Op {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Lt => write!(f, "<"),
            Self::Lte => write!(f, "<="),
            Self::Gt => write!(f, ">"),
            Self::Gte => write!(f, ">="),
        }
    }
}

#[derive(Debug, Clone)]
pub struct Assertion {
    pub metric: Metric,
    pub op: Op,
    pub value: f64,
    pub raw: String,
}

pub struct AssertionResult {
    pub assertion: Assertion,
    pub actual: f64,
    pub passed: bool,
}

pub fn parse(s: &str) -> Result<Assertion> {
    let (op, op_len, split_at) = if let Some(i) = s.find("<=") {
        (Op::Lte, 2, i)
    } else if let Some(i) = s.find(">=") {
        (Op::Gte, 2, i)
    } else if let Some(i) = s.find('<') {
        (Op::Lt, 1, i)
    } else if let Some(i) = s.find('>') {
        (Op::Gt, 1, i)
    } else {
        bail!(
            "assertion must contain an operator: <, <=, >, >=  (got: \"{}\")",
            s
        )
    };

    let metric_str = s[..split_at].trim().to_lowercase();
    let value_str = s[split_at + op_len..]
        .trim()
        .trim_end_matches("ms")
        .trim_end_matches('%')
        .trim();

    let metric = match metric_str.as_str() {
        "p50" => Metric::P50,
        "p95" => Metric::P95,
        "p99" => Metric::P99,
        "p999" => Metric::P999,
        "error-rate" | "error_rate" => Metric::ErrorRate,
        "success-rate" | "success_rate" => Metric::SuccessRate,
        other => bail!(
            "unknown metric \"{}\" — use: p50, p95, p99, p999, error-rate, success-rate",
            other
        ),
    };

    let value: f64 = value_str
        .parse()
        .map_err(|_| anyhow::anyhow!("invalid numeric threshold \"{}\"", value_str))?;

    Ok(Assertion {
        metric,
        op,
        value,
        raw: s.to_string(),
    })
}
