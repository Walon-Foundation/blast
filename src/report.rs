/// Data needed to render an HTML report.
pub struct ReportData {
    pub config_path:   String,
    pub generated_at:  String,
    pub target_rps:    u64,
    pub duration_secs: u64,
    pub total:         usize,
    pub passed:        usize,
    pub success_rate:  f64,
    pub p50:           u128,
    pub p95:           u128,
    pub p99:           u128,
    pub p999:          u128,
    pub endpoints:     Vec<EndpointRow>,
}

/// Per-endpoint statistics row for the HTML table.
pub struct EndpointRow {
    pub name:         String,
    pub total:        usize,
    pub passed:       usize,
    pub success_rate: f64,
    pub p50:          u128,
    pub p99:          u128,
}

/// Build per-endpoint rows by grouping a slice of raw request results.
pub fn build_endpoint_rows(
    results: &[crate::runner::RequestResult],
) -> Vec<EndpointRow> {
    use std::collections::HashMap;

    let mut map: HashMap<String, (usize, usize, Vec<u128>)> = HashMap::new();
    for r in results {
        let entry = map.entry(r.endpoint_name.clone()).or_default();
        entry.0 += 1;
        if r.passed {
            entry.1 += 1;
        }
        entry.2.push(r.latency_ms);
    }

    let mut rows: Vec<EndpointRow> = map
        .into_iter()
        .map(|(name, (total, passed, mut lats))| {
            lats.sort_unstable();
            let pick = |p: usize| -> u128 {
                if lats.is_empty() {
                    return 0;
                }
                let idx = ((p as f64 / 1000.0) * lats.len() as f64) as usize;
                lats[idx.min(lats.len() - 1)]
            };
            let success_rate = if total == 0 {
                0.0
            } else {
                (passed as f64 / total as f64) * 100.0
            };
            EndpointRow {
                name,
                total,
                passed,
                success_rate,
                p50: pick(500),
                p99: pick(990),
            }
        })
        .collect();

    rows.sort_by(|a, b| a.name.cmp(&b.name));
    rows
}

/// Render the HTML report template with the provided data.
pub fn render(data: &ReportData) -> String {
    let template = include_str!("../templates/report.html");

    // Expand {{#each endpoints}}...{{/each}} first so that row-level
    // {{total}}, {{p50}}, {{p99}}, etc. are filled before the global
    // scalar pass replaces the remaining global placeholders.
    let out = expand_each(template, "endpoints", &data.endpoints);

    // Compute SVG bar geometry (max bar height = 130px, baseline at y=140).
    let max_val = [data.p50, data.p95, data.p99, data.p999]
        .iter()
        .copied()
        .max()
        .unwrap_or(1)
        .max(1);

    let bar_h = |v: u128| -> u64 {
        ((v as f64 / max_val as f64) * 130.0).round().max(1.0) as u64
    };
    let bar_y = |v: u128| -> u64 {
        140u64.saturating_sub(bar_h(v))
    };
    let label_y = |v: u128| -> u64 {
        let y = bar_y(v);
        if y < 14 { 14 } else { y.saturating_sub(4) }
    };

    out
        // Meta / summary scalars
        .replace("{{config_path}}",   &data.config_path)
        .replace("{{generated_at}}",  &data.generated_at)
        .replace("{{target_rps}}",    &data.target_rps.to_string())
        .replace("{{duration_secs}}", &data.duration_secs.to_string())
        .replace("{{total}}",         &data.total.to_string())
        .replace("{{passed}}",        &data.passed.to_string())
        .replace("{{success_rate}}",  &format!("{:.1}", data.success_rate))
        // SVG bar geometry (must come before the plain percentile replacements
        // because the tokens are distinct, e.g. {{p50_h}} vs {{p50}}).
        .replace("{{p50_h}}",         &bar_h(data.p50).to_string())
        .replace("{{p95_h}}",         &bar_h(data.p95).to_string())
        .replace("{{p99_h}}",         &bar_h(data.p99).to_string())
        .replace("{{p999_h}}",        &bar_h(data.p999).to_string())
        .replace("{{p50_y}}",         &bar_y(data.p50).to_string())
        .replace("{{p95_y}}",         &bar_y(data.p95).to_string())
        .replace("{{p99_y}}",         &bar_y(data.p99).to_string())
        .replace("{{p999_y}}",        &bar_y(data.p999).to_string())
        .replace("{{p50_label_y}}",   &label_y(data.p50).to_string())
        .replace("{{p95_label_y}}",   &label_y(data.p95).to_string())
        .replace("{{p99_label_y}}",   &label_y(data.p99).to_string())
        .replace("{{p999_label_y}}",  &label_y(data.p999).to_string())
        // Latency values (replace {{p999}} before {{p99}} to be safe,
        // though they are distinct tokens and order does not actually matter).
        .replace("{{p999}}",          &data.p999.to_string())
        .replace("{{p99}}",           &data.p99.to_string())
        .replace("{{p95}}",           &data.p95.to_string())
        .replace("{{p50}}",           &data.p50.to_string())
}

/// Expand a `{{#each NAME}}...{{/each}}` block for a slice of EndpointRows.
fn expand_each(template: &str, name: &str, rows: &[EndpointRow]) -> String {
    let open_tag  = format!("{{{{#each {}}}}}", name);
    let close_tag = "{{/each}}";

    let start = match template.find(&open_tag) {
        Some(i) => i,
        None    => return template.to_string(),
    };
    let end = match template.find(close_tag) {
        Some(i) => i,
        None    => return template.to_string(),
    };

    let row_tpl   = &template[start + open_tag.len()..end];
    let close_end = end + close_tag.len();

    let expanded: String = rows
        .iter()
        .map(|row| {
            row_tpl
                .replace("{{name}}",         &row.name)
                .replace("{{total}}",        &row.total.to_string())
                .replace("{{passed}}",       &row.passed.to_string())
                .replace("{{success_rate}}", &format!("{:.1}", row.success_rate))
                .replace("{{p99}}",          &row.p99.to_string())
                .replace("{{p50}}",          &row.p50.to_string())
        })
        .collect();

    format!("{}{}{}", &template[..start], expanded, &template[close_end..])
}
