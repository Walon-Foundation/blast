use crate::{extractor, runner};
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fs,
    path::{Path, PathBuf},
};

pub fn load_vars(path: &Path) -> Result<HashMap<String, String>> {
    let content = fs::read_to_string(path)
        .with_context(|| format!("failed to read vars file {}", path.display()))?;
    let raw: serde_json::Value =
        serde_json::from_str(&content).with_context(|| "vars file must be valid JSON")?;
    let obj = raw
        .as_object()
        .ok_or_else(|| anyhow::anyhow!("--vars file must be a JSON object at the top level"))?;
    let mut map = HashMap::new();
    for (key, value) in obj {
        match value {
            serde_json::Value::String(s) => {
                map.insert(key.clone(), s.clone());
            }
            serde_json::Value::Number(n) => {
                map.insert(key.clone(), n.to_string());
            }
            serde_json::Value::Bool(b) => {
                map.insert(key.clone(), b.to_string());
            }
            _ => eprintln!(
                "warning: --vars key \"{}\" is not a scalar — skipped",
                key
            ),
        }
    }
    Ok(map)
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct BlastConfig {
    pub base_url: String,
    pub headers: Option<HashMap<String, String>>,
    pub endpoints: Vec<Endpoint>,
    pub setup: Option<Vec<Endpoint>>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Endpoint {
    pub name: String,
    pub method: String,
    pub path: String,
    pub headers: Option<HashMap<String, String>>,
    pub body: Option<serde_json::Value>,
    pub expect_status: Option<u16>,
    pub extract: Option<HashMap<String, String>>,
    pub tags: Option<Vec<String>>,
    pub weight: Option<u32>,
    pub mock_response: Option<serde_json::Value>,
    pub assert: Option<std::collections::HashMap<String, String>>,
}

pub const CONFIG_FILENAME: &str = "blast.config.json";

impl BlastConfig {
    pub fn validate_path(path: &Path) -> Result<PathBuf> {
        let absolute = fs::canonicalize(path)
            .with_context(|| format!("directory doesn't exist {}", path.display()))?;

        if !absolute.is_dir() {
            anyhow::bail!("{} is not a directory", path.display())
        }
        Ok(absolute.join(CONFIG_FILENAME))
    }

    pub fn create(path: &Path) -> Result<PathBuf> {
        let config_path = Self::validate_path(path)?;

        if config_path.exists() {
            anyhow::bail!(
                "{} already exists — delete it first to reinitialise",
                config_path.display()
            )
        }

        let contents = serde_json::to_string_pretty(&Self::template())
            .with_context(|| "failed to serialized default config".to_string())?;

        fs::write(&config_path, contents)
            .with_context(|| format!("failed to write {}", config_path.display()))?;

        Ok(config_path)
    }

    pub fn load(path: &Path) -> Result<Self> {
        let config_path = if path.is_dir() {
            path.join(CONFIG_FILENAME)
        } else {
            path.to_path_buf()
        };

        let file_content = fs::read_to_string(&config_path)
            .with_context(|| format!("failed to read file from {}", path.display(),))?;

        let config: Self = serde_json::from_str(&file_content)
            .with_context(|| "failed to deserialized the config file".to_string())?;

        //checking is the value in the config are valid
        config.validate()?;

        Ok(config)
    }

    fn template() -> Self {
        Self {
            base_url: String::from("http://localhost:3000/"),
            headers: Some(HashMap::from([(
                String::from("Content-Type"),
                String::from("application/json"),
            )])),
            setup: Some(vec![Endpoint {
                name: "health check".to_string(),
                method: "GET".to_string(),
                path: "/health".to_string(),
                headers: None,
                body: None,
                expect_status: Some(200),
                extract: None,
                tags: Some(vec!["check".to_string(), "seed".to_string()]),
                weight: None,
                mock_response: None,
                assert: None,
            }]),
            endpoints: vec![
                Endpoint {
                    name: "health check".to_string(),
                    method: "GET".to_string(),
                    path: "/health".to_string(),
                    headers: None,
                    body: None,
                    expect_status: Some(200),
                    extract: None,
                    tags: Some(vec!["check".to_string(), "seed".to_string()]),
                    weight: None,
                    mock_response: None,
                    assert: None,
                },
                Endpoint {
                    name: "register user".to_string(),
                    method: "POST".to_string(),
                    path: "/api/v1/auth/register".to_string(),
                    headers: None,
                    body: Some(serde_json::json!({
                        "email":    "{{fake.email}}",
                        "password": "{{fake.password}}"
                    })),
                    expect_status: Some(201),
                    extract: None,
                    tags: None,
                    weight: None,
                    mock_response: Some(serde_json::json!({
                        "access_token":"helllll"
                    })),
                    assert: None,
                },
                Endpoint {
                    name: "login".to_string(),
                    method: "POST".to_string(),
                    path: "/api/v1/auth/login".to_string(),
                    headers: None,
                    body: Some(serde_json::json!({
                        "email":    "test@example.com",
                        "password": "Seed1234!"
                    })),
                    expect_status: Some(200),
                    extract: Some(HashMap::from([(
                        "access_token".to_string(),
                        "data.access_token".to_string(),
                    )])),
                    tags: Some(vec![String::from("check"), String::from("seed")]),
                    weight: None,
                    mock_response: None,
                    assert: None,
                },
            ],
        }
    }

    fn validate(&self) -> Result<()> {
        if self.base_url.is_empty() {
            anyhow::bail!("base_url cannot be empty")
        };

        if self.endpoints.is_empty() {
            anyhow::bail!("endpoints cannot be empty")
        };

        for (i, ep) in self.endpoints.iter().enumerate() {
            if ep.name.is_empty() {
                anyhow::bail!("endpoint {} is missing a name", i);
            }
            if ep.path.is_empty() {
                anyhow::bail!("endpoint \"{}\" is missing a path", ep.name);
            }

            let valid = ["POST", "GET", "PATCH", "DELETE", "PUT"];
            let method_upper = ep.method.to_uppercase();

            if !valid.contains(&method_upper.as_str()) {
                anyhow::bail!(
                    "endpoint \"{}\" has invalid method \"{}\"\nvalid: {}",
                    ep.name,
                    ep.method,
                    valid.join(", ")
                )
            }
        }

        Ok(())
    }

    pub async fn load_setup(&self, client: &reqwest::Client) -> Result<HashMap<String, String>> {
        let mut ctx = HashMap::new();

        let setup_endpoint = match &self.setup {
            Some(s) => s,
            None => return Ok(ctx),
        };

        for endpoint in setup_endpoint {
            let result = runner::execute(client, endpoint, &self.base_url, &ctx).await;

            if !result.passed {
                anyhow::bail!(
                    "setup endpoint \"{}\" failed with status {} — cannot continue\nresponse: {}",
                    endpoint.name,
                    result.actual_status,
                    result.error.unwrap_or_default()
                )
            };

            if let (Some(rules), Some(body)) = (&endpoint.extract, &result.body) {
                extractor::extract(body, rules, &mut ctx);
            }
        }

        Ok(ctx)
    }

    pub fn endpoint_for(&self, tag: &str) -> Vec<&Endpoint> {
        let have_any_tags = self.endpoints.iter().any(|e| e.tags.is_some());

        if !have_any_tags {
            return self.endpoints.iter().collect();
        }

        self.endpoints
            .iter()
            .filter(|e| {
                e.tags
                    .as_ref()
                    .map(|tags| tags.iter().any(|t| t == tag))
                    .unwrap_or(false)
            })
            .collect()
    }

    /// Returns cloned endpoints for `tag` with global `config.headers` merged in.
    /// Endpoint-level headers take precedence over global headers.
    pub fn endpoints_with_headers(&self, tag: &str) -> Vec<Endpoint> {
        self.endpoint_for(tag)
            .into_iter()
            .map(|ep| {
                let mut merged = ep.clone();
                if let Some(global) = &self.headers {
                    let mut merged_headers = global.clone();
                    if let Some(ep_headers) = &ep.headers {
                        merged_headers.extend(ep_headers.clone());
                    }
                    merged.headers = Some(merged_headers);
                }
                merged
            })
            .collect()
    }
}

pub fn expand_by_weight(endpoints: Vec<Endpoint>) -> Vec<Endpoint> {
    let mut expanded = Vec::new();
    for endpoint in endpoints {
        let w = endpoint.weight.unwrap_or(1).max(1);
        for _ in 0..w {
            expanded.push(endpoint.clone());
        }
    }
    expanded
}
