use std::{collections::HashMap, path::PathBuf, sync::Arc, time::Duration};
use tokio::net::TcpListener;
use anyhow::Result;
use axum::{Json, extract::State, response::IntoResponse, routing::{get, post, put, patch, delete}};
use reqwest::StatusCode;
use crate::{config::{BlastConfig, Endpoint}, template};

struct MockRoute {
    method:String,
    path: String,
    axum_path:String,
    status: u16,
    response_body: serde_json::Value
}


struct HandlerState {
    status: u16,
    body:   serde_json::Value,
    delay:  u64,
}

type SharedState = Arc<HandlerState>;

pub async fn run(config_path:&PathBuf, port:u16, delay:u16) -> Result<()> {
    let config = BlastConfig::load(config_path)?;
    let routes = build_routes(&config);

    for route in routes.iter() {
        println!("Method: {} path: {} -> Status: {}",
            route.method, route.path, route.status
        )
    }

    let mut router = axum::Router::new();

    for route in routes.iter() {
        let state = Arc::new(HandlerState {
            status: route.status,
            body: route.response_body.clone(),
            delay: delay as u64,
        });
        let method_router = match route.method.as_str() {
            "GET"    => get(mock_handler).with_state(state),
            "POST"   => post(mock_handler).with_state(state),
            "PUT"    => put(mock_handler).with_state(state),
            "PATCH"  => patch(mock_handler).with_state(state),
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
     (StatusCode::from_u16(state.status).unwrap(), Json(state.body.clone()))
}

fn build_routes(config: &BlastConfig) -> Vec<MockRoute> {
    let mut route:Vec<MockRoute> = Vec::new();
    for endpoint in config.endpoints.clone() {
        route.push(MockRoute{
            method: endpoint.method.clone(),
            path: endpoint.path.clone(),
            status: endpoint.expect_status.unwrap_or(200),
            response_body: derive_response_body(&endpoint.clone()),
            axum_path: convert_path(&endpoint.path)
        });
    }

    route
}


fn convert_path(path: &str) -> String {
    path.replace("{paramName}", ":paramName").to_string()
}

fn derive_response_body(endpoint:&Endpoint) -> serde_json::Value {
    match &endpoint.mock_response {
        Some(body) => template::resolve(body, &HashMap::new()),
        None => serde_json::json!({ "status": "ok"})
    }
}