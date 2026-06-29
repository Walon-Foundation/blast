use crate::config::BlastConfig;
use anyhow::Result;
use axum::{
    Json,
    extract::State,
    response::IntoResponse,
    routing::{delete, get, patch, post, put},
};
use regex::Regex;
use reqwest::StatusCode;
use std::{collections::HashMap, path::Path, sync::Arc, time::Duration};
use tokio::net::TcpListener;

struct MockRoute {
    method: String,
    path: String,
    axum_path: String,
    status: u16,
    body_template: Option<serde_json::Value>,
}

struct HandlerState {
    status: u16,
    body_template: Option<serde_json::Value>,
    delay: u64,
}

type SharedState = Arc<HandlerState>;

pub async fn run(config_path: &Path, port: u16, delay: u16) -> Result<()> {
    let config = BlastConfig::load(config_path)?;
    let routes = build_routes(&config);

    for route in routes.iter() {
        println!(
            "Method: {} path: {} -> Status: {}",
            route.method, route.path, route.status
        )
    }

    let mut router = axum::Router::new();

    for route in routes.iter() {
        let state = Arc::new(HandlerState {
            status: route.status,
            body_template: route.body_template.clone(),
            delay: delay as u64,
        });
        let method_router = match route.method.as_str() {
            "GET" => get(mock_handler).with_state(state),
            "POST" => post(mock_handler).with_state(state),
            "PUT" => put(mock_handler).with_state(state),
            "PATCH" => patch(mock_handler).with_state(state),
            "DELETE" => delete(mock_handler).with_state(state),
            _ => continue,
        };
        router = router.route(&route.axum_path, method_router);
    }

    let listener = TcpListener::bind(format!("0.0.0.0:{}", port)).await?;
    println!("mock server listening on http://localhost:{}", port);
    axum::serve(listener, router).await?;

    Ok(())
}

async fn mock_handler(State(state): State<SharedState>) -> impl IntoResponse {
    if state.delay > 0 {
        tokio::time::sleep(Duration::from_millis(state.delay)).await;
    }
    let body = match &state.body_template {
        Some(tmpl) => crate::template::resolve(tmpl, &HashMap::new()),
        None => serde_json::json!({"status": "ok"}),
    };
    (
        StatusCode::from_u16(state.status).unwrap_or(StatusCode::OK),
        Json(body),
    )
}

fn build_routes(config: &BlastConfig) -> Vec<MockRoute> {
    let mut route: Vec<MockRoute> = Vec::new();
    for endpoint in config.endpoints.clone() {
        route.push(MockRoute {
            method: endpoint.method.clone(),
            path: endpoint.path.clone(),
            status: endpoint.expect_status.unwrap_or(200),
            body_template: endpoint.mock_response.clone(),
            axum_path: convert_path(&endpoint.path),
        });
    }

    route
}

fn convert_path(path: &str) -> String {
    let re = Regex::new(r"\{([^}]+)\}").unwrap();
    re.replace_all(path, ":$1").into_owned()
}
