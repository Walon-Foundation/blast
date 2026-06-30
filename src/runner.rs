// src/runner.rs
use reqwest::Client;
use serde_json::Value;
use std::collections::HashMap;
use std::time::Instant;

use crate::config::Endpoint;
use crate::template;

#[derive(Debug, Clone, serde::Serialize)]
pub struct RequestResult {
    pub endpoint_name: String,
    pub method: String,
    pub path: String,
    pub expected_status: Option<u16>,
    pub actual_status: u16,
    pub latency_ms: u128,
    pub passed: bool,
    pub error: Option<String>, // response body on failure or network error
    pub body: Option<Value>,
}

#[derive(Debug)]
pub struct RequestDetail {
    pub url: String,
    pub method: String,
    pub request_headers: std::collections::HashMap<String, String>,
    pub request_body: Option<serde_json::Value>,
    pub response_status: u16,
    pub response_headers: std::collections::HashMap<String, String>,
    pub response_body: Option<serde_json::Value>,
    pub latency_ms: u128,
    pub passed: bool,
}

pub async fn execute_traced(
    client: &Client,
    endpoint: &Endpoint,
    base_url: &str,
    ctx: &HashMap<String, String>,
) -> RequestDetail {
    let url = format!("{}{}", base_url.trim_end_matches('/'), endpoint.path);
    let url = template::resolve_str(&url, ctx);

    let method = endpoint.method.to_uppercase();

    let mut merged_headers = HashMap::new();
    if let Some(ep_headers) = &endpoint.headers {
        let resolved = template::resolve_map(ep_headers, ctx);
        merged_headers.extend(resolved);
    }

    let body_val = endpoint.body.as_ref().map(|b| template::resolve(b, ctx));

    let start = Instant::now();

    let req_method = match method.as_str() {
        "GET" => reqwest::Method::GET,
        "POST" => reqwest::Method::POST,
        "PUT" => reqwest::Method::PUT,
        "PATCH" => reqwest::Method::PATCH,
        "DELETE" => reqwest::Method::DELETE,
        _ => reqwest::Method::GET,
    };

    let mut req = client.request(req_method, &url);

    for (k, v) in &merged_headers {
        req = req.header(k, v);
    }
    if let Some(body) = &body_val {
        req = req.json(body);
    }

    let result = req.send().await;
    let latency_ms = start.elapsed().as_millis();

    match result {
        Err(e) => RequestDetail {
            url,
            method,
            request_headers: merged_headers,
            request_body: body_val,
            response_status: 0,
            response_headers: Default::default(),
            response_body: Some(serde_json::json!({"error": e.to_string()})),
            latency_ms,
            passed: false,
        },
        Ok(resp) => {
            let status = resp.status().as_u16();
            let expected = endpoint.expect_status.unwrap_or(200);
            let passed = status == expected;

            let mut resp_headers = HashMap::new();
            for (k, v) in resp.headers() {
                if let Ok(val) = v.to_str() {
                    resp_headers.insert(k.to_string(), val.to_string());
                }
            }

            let body_bytes = resp.text().await.unwrap_or_default();
            let resp_body: Option<serde_json::Value> =
                serde_json::from_str(&body_bytes).ok().or_else(|| {
                    if body_bytes.is_empty() {
                        None
                    } else {
                        Some(serde_json::json!(body_bytes))
                    }
                });

            RequestDetail {
                url,
                method,
                request_headers: merged_headers,
                request_body: body_val,
                response_status: status,
                response_headers: resp_headers,
                response_body: resp_body,
                latency_ms,
                passed,
            }
        }
    }
}

pub async fn execute(
    client: &Client,
    endpoint: &Endpoint,
    base_url: &str,
    ctx: &HashMap<String, String>,
) -> RequestResult {
    let start = Instant::now();

    let url = format!("{}{}", base_url.trim_end_matches('/'), endpoint.path);

    //resolving the headers
    let resolved_headers = match &endpoint.headers {
        Some(headers) => template::resolve_map(headers, ctx),
        None => HashMap::new(),
    };

    //body
    let resolved_body = endpoint.body.as_ref().map(|b| template::resolve(b, ctx));

    let method = match endpoint.method.to_uppercase().as_str() {
        "GET" => reqwest::Method::GET,
        "POST" => reqwest::Method::POST,
        "PUT" => reqwest::Method::PUT,
        "PATCH" => reqwest::Method::PATCH,
        "DELETE" => reqwest::Method::DELETE,
        "HEAD" => reqwest::Method::HEAD,
        _ => reqwest::Method::GET, // validate() already caught this
    };

    let mut request = client.request(method, &url);

    for (key, value) in &resolved_headers {
        request = request.header(key, value)
    }

    if let Some(body) = resolved_body {
        request = request.json(&body)
    };

    let response = match request.send().await {
        Ok(r) => r,
        Err(e) => {
            let latency_ms = start.elapsed().as_millis();
            return RequestResult {
                endpoint_name: endpoint.name.clone(),
                method: endpoint.method.clone(),
                path: endpoint.path.clone(),
                expected_status: endpoint.expect_status,
                actual_status: 0, // no status — never reached the server
                latency_ms,
                passed: false,
                error: Some(format!("network error: {}", e)),
                body: None,
            };
        }
    };

    let latency_ms = start.elapsed().as_millis();
    let actual_status = response.status().as_u16();

    let passed = match endpoint.expect_status {
        Some(expected) => actual_status == expected,
        None => actual_status < 500,
    };

    // body from the http response
    let body_text = response.text().await.unwrap_or_default();

    let body: Option<Value> = serde_json::from_str(&body_text).ok();

    // checking for error
    let error = if !passed {
        Some(body_text.clone())
    } else {
        None
    };

    //return the result
    RequestResult {
        endpoint_name: endpoint.name.clone(),
        method: endpoint.method.clone(),
        path: endpoint.path.clone(),
        expected_status: endpoint.expect_status,
        actual_status,
        latency_ms,
        passed,
        error,
        body,
    }
}
