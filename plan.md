# Blast — Feature Plan

---

## 1. OpenAPI spec as config

### Why

The current `blast.config.json` is a custom format that only blast understands. OpenAPI is the standard contract format that teams already write to describe their APIs — there are editors, validators, code generators, and mock tools built around it. If blast can read an OpenAPI spec directly, teams can point blast at their existing contract file and start load testing immediately. No translation step, no maintaining two descriptions of the same API.

### Result

`blast` accepts either `blast.config.json` (unchanged, backward compatible) or an OpenAPI 3.x JSON/YAML file passed via `--config`. Blast-specific behaviour (tags, extraction rules, setup steps, fake data bodies) is expressed through standard OpenAPI `x-blast-*` extension fields, so the spec stays valid OpenAPI while carrying everything blast needs.

Example OpenAPI operation with blast extensions:

```json
"/api/v1/auth/register": {
  "post": {
    "operationId": "register user",
    "tags": ["seed"],
    "x-blast-expect-status": 201,
    "requestBody": {
      "content": {
        "application/json": {
          "example": {
            "email": "{{fake.email}}",
            "password": "{{fake.password}}"
          }
        }
      }
    }
  }
}
```

### How

**What needs to exist**

- A new set of serde structs that model just the parts of OpenAPI blast cares about
- A converter function `openapi_to_blast_config` that produces a `BlastConfig` from those structs
- A change to `BlastConfig::load()` so it auto-detects which format it is reading

**Step 1 — model the OpenAPI subset**

Create structs (in `config.rs` or a new `openapi.rs`) for:

```
OpenApiSpec
  openapi: String          ← "3.x.x"
  servers: Vec<Server>
  info: Info
  paths: HashMap<path_string, PathItem>

Server
  url: String

Info
  x-blast-headers: Option<HashMap<String, String>>    ← global headers

PathItem
  get:    Option<Operation>
  post:   Option<Operation>
  put:    Option<Operation>
  patch:  Option<Operation>
  delete: Option<Operation>

Operation
  operation_id:           Option<String>    ← becomes endpoint name
  summary:                Option<String>    ← fallback name
  tags:                   Option<Vec<String>>
  request_body:           Option<RequestBody>
  responses:              HashMap<status_code_string, ResponseObject>
  x-blast-extract:        Option<HashMap<String, String>>
  x-blast-setup:          Option<bool>
  x-blast-expect-status:  Option<u16>

RequestBody
  content: HashMap<media_type, MediaTypeObject>

MediaTypeObject
  example: Option<serde_json::Value>    ← supports {{fake.*}} placeholders

ResponseObject
  (only needed if mock server reads it later)
```

Serde rename: fields like `x-blast-extract` need `#[serde(rename = "x-blast-extract")]`.

**Step 2 — write the converter**

```
fn openapi_to_blast_config(spec: OpenApiSpec) -> Result<BlastConfig>:

  base_url = spec.servers.first()?.url

  global_headers = spec.info["x-blast-headers"]

  setup_endpoints = []
  regular_endpoints = []

  for (path_string, path_item) in spec.paths:
    for (method, operation) in path_item.iter_operations():
      // iter_operations yields ("GET", &op), ("POST", &op), etc.

      name = operation.operation_id
               OR operation.summary
               OR format!("{method} {path_string}")

      body = operation.request_body
               .content["application/json"]
               .example

      expect_status = operation["x-blast-expect-status"]
                       OR parse the first key of operation.responses as u16

      endpoint = Endpoint {
        name, method, path: path_string,
        headers: None,
        body,
        expect_status,
        extract: operation["x-blast-extract"],
        tags:    operation.tags,
      }

      if operation["x-blast-setup"] == true:
        setup_endpoints.push(endpoint)
      else:
        regular_endpoints.push(endpoint)

  return BlastConfig {
    base_url,
    headers: global_headers,
    setup: if setup_endpoints.is_empty() { None } else { Some(setup_endpoints) },
    endpoints: regular_endpoints,
  }
```

**Step 3 — auto-detect format in `BlastConfig::load()`**

```
fn load(path: &Path) -> Result<BlastConfig>:
  content = read file to string

  raw: serde_json::Value = parse content

  if raw["openapi"].is_string():
    spec: OpenApiSpec = serde_json::from_value(raw)?
    return openapi_to_blast_config(spec)
  else:
    // existing path — parse as BlastConfig directly
    config: BlastConfig = serde_json::from_value(raw)?
    config.validate()?
    return config
```

For YAML support: add the `serde_yaml` crate and branch on file extension (`.yaml` / `.yml` → serde_yaml::from_str, otherwise serde_json::from_str).

**Step 4 — nothing else changes**

Every command receives a `BlastConfig` after load. Runner, template, extractor, check, seed, run, stress — all untouched.

---

## 2. stat.rs

### Why

Both `run.rs` and `stress.rs` copy-paste the same `percentile()` free function and manually compute total/passed/failed/error-rate inline. Every stats-related print statement is written from scratch in each file. Adding a new metric (throughput, mean, min/max) or changing how p99 is formatted currently requires edits in two places. A `stat.rs` module gives those numbers one owner.

### Result

A `Stats` struct that any command hands `RequestResult` values to. It computes all derived numbers and knows how to print the standard progress line and final summary. `run.rs` and `stress.rs` both shrink.

### How

**What needs to exist**

- `src/stat.rs` with a `Stats` struct
- Both `run.rs` and `stress.rs` updated to use it
- The private `percentile()` functions in both files deleted

**Step 1 — define Stats**

```
pub struct Stats {
    results: Vec<RequestResult>
}

impl Stats {
    pub fn new() -> Self

    pub fn record(&mut self, result: RequestResult)
      results.push(result)

    pub fn total(&self) -> usize
      results.len()

    pub fn passed(&self) -> usize
      results.iter().filter(|r| r.passed).count()

    pub fn failed(&self) -> usize
      total() - passed()

    pub fn success_rate(&self) -> f64    // 0.0 – 100.0
      if total == 0 { return 0.0 }
      passed as f64 / total as f64 * 100.0

    pub fn error_rate(&self) -> f64
      100.0 - success_rate()

    fn sorted_latencies(&self) -> Vec<u128>
      let mut v: Vec<u128> = results.iter().map(|r| r.latency_ms).collect()
      v.sort_unstable()
      v

    pub fn percentile(&self, p: usize) -> u128
      sorted = sorted_latencies()
      if sorted.is_empty() { return 0 }
      index = ((p as f64 / 100.0) * sorted.len() as f64) as usize
      sorted[index.min(sorted.len() - 1)]

    pub fn p50(&self)  -> u128  { self.percentile(50)  }
    pub fn p95(&self)  -> u128  { self.percentile(95)  }
    pub fn p99(&self)  -> u128  { self.percentile(99)  }
    pub fn p999(&self) -> u128  { self.percentile(999) }

    // one-line for run.rs live progress:
    // "  elapsed: Xs   sent: N   success: N   p99: Nms"
    pub fn print_progress(&self, elapsed_secs: u64)

    // final block for run.rs:
    // Total requests / Duration / Success rate / Latency table
    pub fn print_summary(&self, duration: Duration)

    // single coloured row for stress.rs step table:
    // "  10 req/s   150 req   100.0%   p50: 6ms   p99: 11ms   errors: 0"
    // returns true if this step is a breaking point (p99 > 500 || error_rate > 1.0)
    pub fn print_step_row(&self, rps: u64) -> bool
}
```

**Step 2 — use Stats in run.rs**

The `results` Arc<Mutex<Vec<RequestResult>>> becomes an Arc<Mutex<Stats>>. The inline progress print and the final summary both call methods on Stats instead of recomputing inline.

Before the loop: `let stats = Arc::new(Mutex::new(Stats::new()))`

Inside the spawn: `stats.lock().await.record(result)`

For the per-second progress print: `stats.lock().await.print_progress(elapsed_secs)`

After joining handles: `stats.lock().await.print_summary(duration)`

**Step 3 — use Stats in stress.rs**

Each RPS step gets its own local `Stats`. At the end of the step, call `print_step_row(current_rps)` which returns the breaking-point boolean. Keep `step_results` as a `Vec<Stats>` (or a thin struct wrapping one) to power the final summary table.

The `StepResult` struct goes away. The final table loops over the Vec and calls `p50/p95/p99` and `success_rate` directly on each Stats.

**Step 4 — register the module**

Add `mod stat;` in `main.rs`. Both `run.rs` and `stress.rs` import `crate::stat::Stats`. Delete the two private `percentile()` functions.

---

## 3. Mock server

### Why

Frontend developers often know what their API should return — the shape of the data, the status codes, the field names — before any backend exists. Without a mock server they either stub responses in the frontend code (making the code harder to clean up) or block on the backend. `blast mock` reads the same config file the rest of blast uses, starts a local HTTP server, and responds to requests with plausible fake data generated from the schema or examples. No backend needed to start building.

### Result

`blast mock [--port 3000] [--delay 0]` starts a local HTTP server. On startup it prints a table of every registered route and what it will return. For each request it logs the method, path, and status. Responses are generated from:

1. The `example` field in the OpenAPI response (returned verbatim)
2. The JSON Schema in the OpenAPI response (generated recursively from types)
3. Fallback: `{"status": "ok"}` with the declared status code

Works with blast.config.json too (returns minimal responses since there is no schema).

### How

**What needs to exist**

- A new crate dependency: `axum` (tokio-native HTTP framework)
- `src/commands/mock.rs` — the command handler
- `src/schema_gen.rs` — JSON Schema → fake Value generator (used if OpenAPI feature is done; otherwise not needed for basic mode)
- New `Mock` variant in `Command` enum in `main.rs`

**Step 1 — add the command to main.rs**

```
Mock {
  #[arg(long, default_value = "3000")]
  port: u16,

  #[arg(long, default_value = "0")]
  delay: u64,   // milliseconds
}
```

Wire it to `commands::mock::run(&cli.config, port, delay).await?` in the match.

**Step 2 — build the route list from config**

```
fn build_routes(config: &BlastConfig) -> Vec<MockRoute>:
  for endpoint in config.endpoints + config.setup (flattened):
    route = MockRoute {
      method:      endpoint.method,
      path:        endpoint.path,           // "/api/v1/users/{id}" in OpenAPI form
      axum_path:   convert_path(endpoint.path),  // "/api/v1/users/:id" for axum
      status:      endpoint.expect_status.unwrap_or(200),
      response_body: derive_response_body(endpoint),
    }

fn convert_path(openapi_path: &str) -> String:
  replace all "{paramName}" with ":paramName"

fn derive_response_body(endpoint: &Endpoint) -> serde_json::Value:
  // if OpenAPI feature exists: check the spec for response example or schema
  // fallback: {"status": "ok", "path": endpoint.path}
```

**Step 3 — build the axum router**

```
async fn run(config_path, port, delay):
  config = BlastConfig::load(config_path)?
  routes = build_routes(&config)

  print startup table:
    for each route: "  METHOD  /path  →  status N"

  let mut router = axum::Router::new()

  for route in routes:
    handler = make_handler(route.status, route.response_body, delay)
    router = match route.method.as_str():
      "GET"    => router.route(route.axum_path, get(handler))
      "POST"   => router.route(route.axum_path, post(handler))
      "PUT"    => router.route(route.axum_path, put(handler))
      "PATCH"  => router.route(route.axum_path, patch(handler))
      "DELETE" => router.route(route.axum_path, delete(handler))

  let listener = TcpListener::bind(format!("0.0.0.0:{}", port)).await?
  println!("mock server listening on http://localhost:{}", port)
  axum::serve(listener, router).await?
```

**Step 4 — the handler factory**

Axum handlers need to be `async fn` values or closures that implement the `Handler` trait. The simplest approach is to capture state in an `Arc`:

```
struct HandlerState {
  status: u16,
  body:   serde_json::Value,
  delay:  u64,
}

// register each route pointing at the same generic async fn,
// but with different State<Arc<HandlerState>>:

async fn mock_handler(
  State(state): State<Arc<HandlerState>>
) -> impl IntoResponse:
  if state.delay > 0:
    tokio::time::sleep(Duration::from_millis(state.delay)).await
  (StatusCode::from_u16(state.status).unwrap(), Json(state.body.clone()))
```

Each route gets its own `Arc<HandlerState>`, registered via `.with_state(arc)`.

**Step 5 — schema_gen.rs (optional, enhances mock quality)**

Only needed if using OpenAPI spec. Given a `serde_json::Value` that is a JSON Schema object, generate a fake `Value`:

```
pub fn from_schema(schema: &Value) -> Value:
  match schema["type"].as_str():
    "string" =>
      match schema["format"].as_str():
        "email"     => Value::String(fake_email())
        "uuid"      => Value::String(fake_uuid())
        "date-time" => Value::String("2026-01-01T00:00:00Z")
        _           => Value::String(fake_word())

    "integer" | "number" =>
      Value::Number(random u32 in 1..1000)

    "boolean" =>
      Value::Bool(true)

    "array" =>
      items_schema = schema["items"]
      Value::Array(vec![
        from_schema(items_schema),
        from_schema(items_schema),
      ])

    "object" =>
      let mut map = serde_json::Map::new()
      for (key, prop_schema) in schema["properties"].as_object():
        map.insert(key, from_schema(prop_schema))
      Value::Object(map)

    _ => Value::Null
```

---

## Implementation order

1. **stat.rs** first — it is self-contained, has no new dependencies, and immediately cleans up existing code without changing any behaviour. Good warmup.

2. **OpenAPI spec** second — it only touches `config.rs` (and a new `openapi.rs`). Everything downstream stays the same. Once done, the mock server can use rich schema data.

3. **Mock server** last — depends on axum (new dependency) and benefits from the OpenAPI schema work. Adding it last keeps the scope of each step clear.
