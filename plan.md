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
  // Don't define a struct for this. The keys of the responses HashMap ARE the
  // status codes ("200", "201", etc.). Use HashMap<String, serde_json::Value>
  // so you can walk the raw JSON later in the mock server without losing any fields.
  responses: HashMap<String, serde_json::Value>
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

Two things need fixing in the existing code before adding format detection: directory resolution needs to know the new default filename, and YAML must be branched before parsing, not after.

```
fn load(path: &Path) -> Result<BlastConfig>:

  // resolve directory → file
  config_path = if path.is_dir():
    let candidate = path.join("openapi.json")
    if candidate.exists():
      candidate
    else:
      path.join("blast.config.json")   // backward compat fallback
  else:
    path.to_path_buf()

  content = read config_path to string

  // detect format by extension BEFORE parsing
  raw: serde_json::Value = if config_path extension is ".yaml" or ".yml":
    serde_yaml::from_str(&content)?    // new dep: serde_yaml
  else:
    serde_json::from_str(&content)?

  // detect schema by presence of "openapi" key
  if raw["openapi"].is_string():
    spec: OpenApiSpec = serde_json::from_value(raw)?
    return openapi_to_blast_config(spec)
  else:
    config: BlastConfig = serde_json::from_value(raw)?
    config.validate()?
    return config
```

Also add a `load_raw(path: &Path) -> Result<serde_json::Value>` sibling that returns the parsed JSON/YAML before conversion — the mock server needs this to access response schemas that are lost during `openapi_to_blast_config`.

**Step 4 — `CONFIG_FILENAME` and `validate_path()` in `config.rs`**

`validate_path()` is only called by `create()` (the init command). It currently appends `CONFIG_FILENAME = "blast.config.json"` to the directory. Change the constant:

```
pub const CONFIG_FILENAME: &str = "openapi.json";
```

`validate_path()` itself needs no other change — it checks that the path is a directory then appends the filename. The rest of the logic stays.

`load()` uses `CONFIG_FILENAME` as the fallback when a directory is given. With the new constant it tries `openapi.json` first (explicit candidate check in Step 3 above), then falls back to `blast.config.json` for people with existing configs. Old users pass `--config blast.config.json` or place it next to `openapi.json` — either works because `load()` accepts an explicit file path directly.

**Step 5 — `template()` and `create()` in `config.rs`**

`create()` currently calls `serde_json::to_string_pretty(&Self::template())` where `template()` returns a `BlastConfig`. That produces the old JSON format. After the change the file on disk must be OpenAPI.

Add a separate function (don't touch `template()` — it may still be useful internally):

```
fn openapi_template() -> serde_json::Value:
  // return a hardcoded serde_json::json!({...}) that is a valid OpenAPI 3.x spec
  // with x-blast extensions, mirroring what template() currently produces
  // but in OpenAPI shape:
  //   openapi, info, servers, paths
  // paths contains the health check GET (x-blast-setup: true),
  // register user POST (tags: ["seed"], x-blast-expect-status: 201),
  // login POST (tags: ["check","seed"], x-blast-extract: {...})
```

Change `create()` to call `openapi_template()` instead of `template()`:

```
fn create(path: &Path) -> Result<PathBuf>:
  config_path = Self::validate_path(path)?
  if config_path.exists(): bail!
  contents = serde_json::to_string_pretty(&Self::openapi_template())?
  fs::write(&config_path, contents)?
  Ok(config_path)
```

**Step 6 — `commands/init.rs`**

No code changes needed. `init.rs` calls `BlastConfig::create()` and prints the path. The only thing that changes is the message printed after creation — update the `println!` to say something like `"edit openapi.json to describe your API, then run blast check"`. The file created is now `openapi.json`.

**Step 7 — `commands/validate.rs`**

The load → print loop works as-is after the change because `load()` converts transparently to `BlastConfig`. The displayed info (`base_url`, endpoint list, extract rules) all comes from the converted struct so it's accurate regardless of source format.

One optional improvement: peek at the file before loading to show the detected format in the header line. Currently it prints `"loading <path>... valid"`. You could change this to `"loading <path> (OpenAPI 3.x)... valid"` by reading the raw JSON and checking for the `"openapi"` key before calling `load()`. Not required — just a UX nicety.

**Step 8 — `commands/check.rs`, `seed.rs`, `run.rs`, `stress.rs`**

No changes. All four call `BlastConfig::load()` and receive a `BlastConfig`. The conversion is invisible to them.

**Step 9 — `blast.config.json` (the example file in the repo root)**

This file is the working example committed to the repository. Rename it to `openapi.json` and rewrite its contents as an OpenAPI 3.x spec with `x-blast-*` extensions that covers the same three endpoints (health check, register user, login). The old blast format fields map like this:

```
blast.config.json field           OpenAPI location
─────────────────────────────     ────────────────────────────────────────
base_url                          servers[0].url
headers (global)                  info.x-blast-headers
endpoint.name                     paths.{path}.{method}.operationId
endpoint.method                   the key under paths.{path}
endpoint.path                     the key under paths
endpoint.body                     requestBody.content.application/json.example
endpoint.expect_status            x-blast-expect-status  (or first response key)
endpoint.extract                  x-blast-extract
endpoint.tags                     tags  (standard OpenAPI field, reused)
setup endpoints                   any operation with x-blast-setup: true
```

**Step 10 — `src/main.rs`**

Two small updates:
- The `--config` arg's help string currently says `blast.config.json`. Change it to say something like `path to openapi.json or blast.config.json (default: current directory)`.
- The hardcoded `version = "0.1.0"` in `#[command(...)]` should be replaced with `version` (no value) so clap reads the version from `Cargo.toml` at compile time via the `CARGO_PKG_VERSION` env var. This isn't strictly related to OpenAPI but it means you won't forget to update it.

**Step 11 — `README.md`**

The Configuration section is the biggest documentation update. Every code block and table in that section references the old format. Changes needed:

- Replace the full `blast.config.json` example block with an `openapi.json` example showing the same endpoints in OpenAPI format with `x-blast-*` extensions
- Replace "Top-level fields" table with an OpenAPI-oriented table: `servers[0].url`, `info.x-blast-headers`, `paths`, `x-blast-setup`
- Replace "Endpoint fields" table columns to map OpenAPI operation fields: `operationId`, `tags`, `requestBody`, `x-blast-expect-status`, `x-blast-extract`
- Tags section: note that `tags` is now a standard OpenAPI field (not blast-specific), with the same `seed`/`run`/`stress` values
- Setup phase section: replace `"setup": [...]` array description with `x-blast-setup: true` on individual operations
- Request chaining section: replace `"extract": {...}` with `"x-blast-extract": {...}` on operations
- Quick start step 1: `blast init` now creates `openapi.json`, update the comment
- Fake data section: note that `{{fake.*}}` placeholders go in `requestBody.content.application/json.example`, same syntax, different location

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

**Important: mock.rs needs the raw spec, not the converted BlastConfig**

`openapi_to_blast_config` discards response schemas — it only keeps what blast needs to fire requests. The mock server needs the opposite: response bodies to serve back. So mock.rs must call `BlastConfig::load_raw()` (defined in the OpenAPI step) to get the raw `serde_json::Value`, navigate the paths manually to find response examples/schemas, AND call `BlastConfig::load()` to get the route list. Both calls read the same file; the duplication is acceptable.

If the file is not OpenAPI (no `"openapi"` key in the raw value), mock.rs falls back to minimal responses (`{"status": "ok"}`). Check for OpenAPI by reading `raw["openapi"].is_string()` before trying to navigate response schemas.

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

fn derive_response_body(endpoint: &Endpoint, raw_spec: Option<&serde_json::Value>) -> serde_json::Value:
  // raw_spec is the full parsed openapi.json, passed in from mock.rs
  // navigate: raw_spec["paths"][path][method.to_lowercase()]["responses"]
  // find the first 2xx key, then try:
  //   response["content"]["application/json"]["example"]  → return verbatim
  //   response["content"]["application/json"]["schema"]   → pass to schema_gen::from_schema()
  // if raw_spec is None (blast.config.json format) or no 2xx found:
  //   fallback: json!({"status": "ok"})
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

## 4. `{{env.VAR}}` template support

### Why

API keys, auth tokens, and org IDs should not live in the spec file committed to git. Right now the only way to inject a value into a request is to hardcode it or use a fake generator. Teams that want to run blast against a real environment need to pass secrets somehow.

### Result

`{{env.API_KEY}}` works anywhere a `{{placeholder}}` works — request bodies, headers, paths. The value is read from the process environment at request time. Unset variables warn and leave the placeholder in place so the user notices rather than silently sending a broken request.

### How

**What needs to change**

Only `src/template.rs` — one branch in `resolve_key()`.

**Step 1 — add env prefix to `resolve_key()`**

```
fn resolve_key(key: &str, ctx: &Context) -> String:

  // check context first (extracted values, --vars file)
  if let Some(val) = ctx.get(key):
    return val.clone()

  // env variable support
  if key.starts_with("env."):
    let var_name = &key[4..]          // strip "env." prefix
    return match std::env::var(var_name):
      Ok(val)  => val
      Err(_)   =>
        eprintln!("warning: env var {} is not set — left unchanged", var_name)
        format!("{{{{{}}}}}", key)    // return original so user notices

  // existing fake.* match arms follow unchanged
  match key:
    "fake.email" => ...
    ...
```

No changes needed in any command file — `resolve_key` is called by `resolve_str` which is called everywhere templates are expanded.

---

## 5. Threshold assertions for `run` and `stress`

### Why

Both commands exit 0 regardless of the results. A team can't use blast as a CI performance gate — a deploy step has no way to fail when p99 regresses from 50ms to 800ms. The data is already there in `Stats`; it just isn't checked against any pass/fail condition.

### Result

`--assert p99<200ms` and `--assert error-rate<0.5%` flags on `run` and `stress`. After the test finishes, each assertion is evaluated against the final stats. If any fail, blast prints which ones and exits non-zero. Multiple `--assert` flags are allowed.

### How

**What needs to change**

- `src/main.rs` — add `--assert` flag to `Run` and `Stress` variants
- `src/stat.rs` — add an `evaluate(assertions) -> Vec<AssertionResult>` method
- `src/commands/run.rs` and `src/commands/stress.rs` — call evaluate and exit on failure

**Step 1 — parse assertion strings**

```
// in a new src/assertion.rs or inline in stat.rs

struct Assertion {
  metric: Metric,   // P50 | P95 | P99 | P999 | ErrorRate | SuccessRate
  op:     Op,       // Lt | Lte | Gt | Gte
  value:  f64,      // the numeric threshold
}

// parse from a string like "p99<200ms" or "error-rate<0.5%"
fn parse(s: &str) -> Result<Assertion>:
  // split on op character (<, <=, >, >=)
  // left side → Metric (strip "ms" or "%" suffix insensitively)
  // right side → f64 (strip "ms" or "%" suffix)
  // error on unrecognised metric or malformed value
```

**Step 2 — add `evaluate` to `Stats`**

```
struct AssertionResult {
  assertion: Assertion,
  actual:    f64,
  passed:    bool,
}

impl Stats {
  pub fn evaluate(&self, assertions: &[Assertion]) -> Vec<AssertionResult>:
    for assertion in assertions:
      actual = match assertion.metric:
        P50         => self.p50()  as f64
        P95         => self.p95()  as f64
        P99         => self.p99()  as f64
        P999        => self.p999() as f64
        ErrorRate   => self.error_rate()
        SuccessRate => self.success_rate()

      passed = match assertion.op:
        Lt  => actual <  assertion.value
        Lte => actual <= assertion.value
        Gt  => actual >  assertion.value
        Gte => actual >= assertion.value

      results.push(AssertionResult { assertion, actual, passed })
}
```

**Step 3 — check results in run.rs and stress.rs**

After `stats.print_summary()`:

```
if !assertions.is_empty():
  results = stats.evaluate(&assertions)
  let failed: Vec<_> = results.iter().filter(|r| !r.passed).collect()

  if !failed.is_empty():
    println!("\nassertions failed:")
    for r in &failed:
      println!("  ✗  {} {} {} (actual: {})", r.assertion.metric, r.assertion.op, r.assertion.value, r.actual)
    anyhow::bail!("{} assertion(s) failed", failed.len())
  else:
    println!("\nall assertions passed")
```

For `stress`, evaluate against the stats of the final completed step (or the breaking-point step if one was detected).

---

## 6. Body assertions in `check`

### Why

`blast check` only verifies the HTTP status code. An endpoint can return 200 with `{"error": "unauthorised"}` and blast reports it as passing. Real integration testing requires checking that the response body contains the expected values, not just that the server responded.

### Result

`x-blast-assert` on an operation in the OpenAPI spec (or an `assert` field in `blast.config.json`) defines a map of dot-path → expected value. After `check` receives a passing status, it evaluates each assertion against the response body. Failures are shown inline alongside the endpoint row.

```json
"x-blast-assert": {
  "data.status": "active",
  "data.count":  ">0"
}
```

### How

**What needs to change**

- `src/config.rs` — add `assert: Option<HashMap<String, String>>` to `Endpoint`
- `src/openapi.rs` — map `x-blast-assert` on `Operation` to `Endpoint.assert` in the converter
- `src/commands/check.rs` — evaluate assertions after a passing request

**Step 1 — add the field to `Endpoint`**

```
Endpoint:
  ...existing fields...
  assert: Option<HashMap<String, String>>   // dot-path → expected value or comparison
```

**Step 2 — evaluate in check.rs**

After `extractor::extract()` runs on a passing result:

```
fn evaluate_assertions(body: &Value, rules: &HashMap<String, String>) -> Vec<(String, bool, String)>:
  // returns (dot-path, passed, reason) for each rule

  for (path, expected) in rules:
    actual_value = extractor::get_path(body, path)  // reuse existing fn

    passed = match actual_value:
      None        => false   // path not found
      Some(value) =>
        actual_str = value as string

        if expected starts with ">":
          parse both as f64, compare
        elif expected starts with "<":
          parse both as f64, compare
        else:
          actual_str == expected   // string equality
```

Print assertion results indented under the endpoint row:

```
  ✓  list users          GET /api/v1/users  12ms
       ✓  data.status == "active"
       ✗  data.count > 0  (got: 0)
```

Count assertion failures alongside status failures in the final `N/N passed` summary.

---

## 7. Structured output

### Why

All output is colored terminal text. There is no way to pipe results into another tool, save them as a CI artifact, or compare two runs programmatically. The data is already computed in `Stats` — it just can't be serialized.

### Result

`--output json` on `run` and `stress` writes the complete result set to stdout as JSON instead of the human-readable summary. Other tools (dashboards, scripts, a future `blast compare`) can consume it. The terminal output continues to stderr when `--output json` is active so progress lines don't pollute the JSON.

### How

**What needs to change**

- `src/main.rs` — add `--output` flag to `Run` and `Stress`
- `src/stat.rs` — add `to_json()` method
- `src/runner.rs` — derive `Serialize` on `RequestResult`
- `src/commands/run.rs` and `src/commands/stress.rs` — branch on output mode at the end

**Step 1 — add the flag**

```
// in main.rs Run and Stress variants:
#[arg(long, default_value = "terminal")]
output: OutputFormat    // enum: Terminal | Json
```

**Step 2 — add `to_json()` to Stats**

```
impl Stats {
  pub fn to_json(&self, duration: Duration) -> serde_json::Value:
    json!({
      "total":        self.total(),
      "passed":       self.passed(),
      "failed":       self.failed(),
      "success_rate": self.success_rate(),
      "duration_secs": duration.as_secs(),
      "latency": {
        "p50":  self.p50(),
        "p95":  self.p95(),
        "p99":  self.p99(),
        "p999": self.p999(),
      },
      "requests": self.results   // Vec<RequestResult> — needs Serialize on RequestResult
    })
}
```

**Step 3 — branch in run.rs and stress.rs**

```
match output:
  OutputFormat::Terminal => stats.print_summary(duration)
  OutputFormat::Json     => println!("{}", serde_json::to_string_pretty(&stats.to_json(duration))?)
```

For `stress`, `to_json()` should also accept the `Vec<Stats>` step results and include a `"steps"` array.

Progress lines in `print_progress()` should go to `eprintln!` (stderr) so they don't corrupt JSON output on stdout.

---

## 8. `x-blast-weight` for traffic shaping

### Why

`run.rs` and `stress.rs` round-robin endpoints equally. In real traffic, a GET endpoint serving a list page gets 10× the requests of a POST that creates a resource. Equal weighting produces an unrealistic load profile that doesn't reflect what a server actually experiences in production.

### Result

`x-blast-weight: 3` on an OpenAPI operation (or `"weight": 3` in `blast.config.json`) means that endpoint takes 3 slots in the rotation. An unweighted endpoint defaults to weight 1. The total traffic distribution matches the weight ratios.

### How

**What needs to change**

- `src/config.rs` — add `weight: Option<u32>` to `Endpoint`
- `src/openapi.rs` — map `x-blast-weight` in the converter
- `src/commands/run.rs` and `src/commands/stress.rs` — expand endpoint list by weight before the loop

**Step 1 — add field to Endpoint**

```
Endpoint:
  ...existing fields...
  weight: Option<u32>   // defaults to 1 if absent
```

**Step 2 — expand the endpoint list by weight**

This happens once, right after `config.endpoint_for(tag)` returns the filtered list, before the Arc is created:

```
fn expand_by_weight(endpoints: Vec<&Endpoint>) -> Vec<Endpoint>:
  let mut expanded = Vec::new()
  for endpoint in endpoints:
    let w = endpoint.weight.unwrap_or(1).max(1)
    for _ in 0..w:
      expanded.push(endpoint.clone())
  expanded
```

The round-robin index modulo then distributes across the expanded list. No changes to the loop itself.

---

## 9. Variable file (`--vars`)

### Why

Some placeholders in a spec aren't fake data and aren't extracted from a prior response — they're test fixture values like a known user ID, an organisation slug, or a seeded resource ID. Right now there's no way to inject these without hardcoding them in the spec or using a setup endpoint that creates them first.

### Result

`--vars staging.json` on any command reads a flat JSON object and merges it into the template context before any requests run. `{{user_id}}` in a request body or header is resolved to the value from the file. Works alongside `{{fake.*}}`, `{{env.VAR}}`, and extracted values — variable file has lowest precedence (extracted values and env override it).

### How

**What needs to change**

- `src/main.rs` — add `--vars` optional flag to all commands except `init` and `validate`
- `src/commands/run.rs`, `seed.rs`, `stress.rs`, `check.rs` — call `load_vars()` and merge into ctx before the loop

**Step 1 — add the flag**

```
// global optional flag alongside --config in Cli struct:
#[arg(long, global = true)]
vars: Option<PathBuf>
```

**Step 2 — load and merge**

```
fn load_vars(path: &Path) -> Result<HashMap<String, String>>:
  content = fs::read_to_string(path)?
  raw: serde_json::Value = serde_json::from_str(&content)?
  obj = raw.as_object().context("--vars file must be a JSON object")?

  let mut map = HashMap::new()
  for (key, value) in obj:
    // only accept scalar values at the top level
    match value:
      Value::String(s)  => map.insert(key, s)
      Value::Number(n)  => map.insert(key, n.to_string())
      Value::Bool(b)    => map.insert(key, b.to_string())
      _                 => eprintln!("warning: --vars key {} is not a scalar — skipped", key)
  Ok(map)
```

In each command, after `load_setup()` returns `ctx`, merge vars in:

```
if let Some(vars_path) = &cli.vars:
  let vars = load_vars(vars_path)?
  // vars are lowest priority — don't overwrite keys already in ctx
  for (k, v) in vars:
    ctx.entry(k).or_insert(v)
```

---

## 10. `blast trace`

### Why

When an endpoint fails in `blast check`, the output shows the status code and a trimmed response body. That is often not enough to diagnose the problem — you don't see which headers were sent, what the request body looked like after template resolution, or the full response. Right now the only alternative is to reach for curl and reconstruct the request manually.

### Result

`blast trace <endpoint-name>` runs a single request for the named endpoint and prints the full round-trip: resolved URL, method, every header sent, the resolved request body, response status, response headers, response body, and latency. Setup runs first so extracted values (tokens, IDs) are available.

### How

**What needs to change**

- `src/main.rs` — add `Trace { name: String }` variant to `Command`
- `src/commands/trace.rs` — new file, the command handler
- `src/runner.rs` — add a `RequestDetail` struct that captures headers sent and response headers (currently discarded)

**Step 1 — extend runner to capture headers**

```
struct RequestDetail {
  url:              String,
  method:           String,
  request_headers:  HashMap<String, String>,
  request_body:     Option<serde_json::Value>,
  response_status:  u16,
  response_headers: HashMap<String, String>,
  response_body:    Option<serde_json::Value>,
  latency_ms:       u128,
  passed:           bool,
}

// new fn alongside execute():
pub async fn execute_traced(
  client: &Client,
  endpoint: &Endpoint,
  base_url: &str,
  ctx: &HashMap<String, String>
) -> RequestDetail
```

The difference from `execute()`: before sending, capture the resolved headers and body; after receiving, capture `response.headers()` before consuming the body.

**Step 2 — trace.rs**

```
pub async fn run(config_path: &Path, name: &str) -> Result<()>:
  config = BlastConfig::load(config_path)?

  endpoint = config.endpoints.iter()
    .find(|e| e.name == name)
    .context(format!("no endpoint named \"{}\"", name))?

  client = Client::builder().timeout(Duration::from_secs(30)).build()?
  ctx    = config.load_setup(&client).await?

  detail = runner::execute_traced(&client, endpoint, &config.base_url, &ctx).await

  println!("── request ─────────────────────────")
  println!("{} {}", detail.method, detail.url)
  for (k, v) in &detail.request_headers:
    println!("  {}: {}", k, v)
  if let Some(body) = &detail.request_body:
    println!("{}", serde_json::to_string_pretty(body)?)

  println!("── response ({} {}ms) ───────────────", detail.response_status, detail.latency_ms)
  for (k, v) in &detail.response_headers:
    println!("  {}: {}", k, v)
  if let Some(body) = &detail.response_body:
    println!("{}", serde_json::to_string_pretty(body)?)
```

Color the status line green if passed, red if not. No changes to any existing command.

---

## 11. Ramp-up on `run`

### Why

`blast run` starts firing at full RPS on the first tick. A server coming out of a cold start — empty connection pool, unwarmed caches, lazy-initialised thread pools — will show inflated latency in the first few seconds that isn't representative of steady-state performance. The first N seconds of results skew the percentiles.

### Result

`--ramp-up <seconds>` on `blast run`. During the ramp-up window, blast scales RPS linearly from 0 to the target. Requests sent during ramp-up are excluded from the final percentile calculation — only steady-state results count. The ramp-up window is shown in progress output but marked separately.

### How

**What needs to change**

- `src/main.rs` — add `--ramp-up` flag to `Run` (default 0, meaning no ramp)
- `src/commands/run.rs` — add a ramp phase before the main loop, track whether each result is from ramp-up or steady-state

**Step 1 — ramp phase before the main loop**

```
// before the main loop, if ramp_up > 0:
let ramp_duration = Duration::from_secs(ramp_up)
let ramp_start    = Instant::now()
let mut ramp_idx  = 0

let mut ramp_ticker = tokio::time::interval(/* start slow, recalculate each tick */)

loop:
  elapsed = ramp_start.elapsed()
  if elapsed >= ramp_duration: break

  // linear interpolation: fraction of ramp complete → fraction of target RPS
  fraction       = elapsed.as_secs_f64() / ramp_duration.as_secs_f64()
  current_rps    = (fraction * rps as f64).max(1.0) as u32
  interval_ms    = 1000 / current_rps

  // fire request — result pushed to a separate ramp_results vec, not main results
  ramp_ticker.reset_after(Duration::from_millis(interval_ms.into()))
  // spawn request...
  ramp_idx += 1
```

After the ramp loop, wait for ramp handles to finish, then start the main loop with the full-RPS ticker as before. Only `results` (not `ramp_results`) goes into `Stats` for the final summary.

Print a header line before the main loop: `"ramp-up complete — measuring at {} req/s"`.

---

## 12. Scenario mode

### Why

`run` round-robins endpoints independently. Each request is stateless relative to the others. Real API usage has journeys: a user registers, then logs in, then creates a resource, then fetches it. Round-robin can't model this — the register and login requests get equal traffic to everything else, and there's no extraction chain between them within a single virtual user's iteration.

### Result

`x-blast-scenario: "journey-name"` on OpenAPI operations groups them into an ordered sequence. When `blast run` or `blast stress` detects scenarios, each concurrency slot runs the full sequence as one unit: it fires every endpoint in order, extracting values along the way, then starts again from the top. Unscenarioed endpoints still round-robin as before.

### How

**What needs to change**

- `src/config.rs` — add `scenario: Option<String>` to `Endpoint`
- `src/openapi.rs` — map `x-blast-scenario` in the converter
- `src/config.rs` — add `scenarios(&self) -> HashMap<String, Vec<&Endpoint>>` method that groups by scenario name, preserving spec order
- `src/commands/run.rs` — detect scenarios and switch to scenario execution mode

**Step 1 — group endpoints into scenarios**

```
impl BlastConfig {
  pub fn scenarios(&self) -> HashMap<String, Vec<&Endpoint>>:
    let mut map: HashMap<String, Vec<&Endpoint>> = HashMap::new()
    for endpoint in &self.endpoints:
      if let Some(scenario) = &endpoint.scenario:
        map.entry(scenario).or_default().push(endpoint)
    map
    // order within each Vec reflects order in self.endpoints (spec order)
}
```

**Step 2 — scenario execution in run.rs**

```
let scenarios = config.scenarios()

if scenarios.is_empty():
  // existing round-robin path unchanged
else:
  // pick one scenario per spawn slot (round-robin across scenario names)
  // within each spawn:
  async fn run_scenario(
    client, base_url, endpoints: Vec<Endpoint>, global_ctx
  ) -> Vec<RequestResult>:
    let mut local_ctx = global_ctx.clone()  // isolated per virtual-user
    let mut results   = Vec::new()

    for endpoint in &endpoints:
      let result = runner::execute(client, endpoint, base_url, &local_ctx).await
      // extract into local_ctx so next endpoint in sequence can use it
      if result.passed:
        if let (Some(rules), Some(body)) = (&endpoint.extract, &result.body):
          extractor::extract(body, rules, &mut local_ctx)
      results.push(result)

    results
  // all RequestResults from all steps in the scenario go into the shared Stats
```

---

## 13. `blast history`

### Why

There is no memory between runs. After improving a slow endpoint, the only way to verify improvement is to remember the old p99 from the previous terminal session. Comparing runs requires external tooling or manual note-taking.

### Result

After every `blast run` or `blast stress`, the result is automatically saved to `~/.blast/history/`. On the next run against the same config file, blast prints a one-line diff: `p99: 45ms → 89ms (+98%) ▲` or `p99: 45ms → 31ms (−31%) ▼`. No flags required — it happens silently and doesn't affect the exit code.

### How

**What needs to change**

- `src/history.rs` — new file: save, load-last, diff
- `src/commands/run.rs` and `src/commands/stress.rs` — call `history::save()` after stats are computed, then `history::diff_print()` if a previous entry exists

**Step 1 — define the history record**

```
struct HistoryRecord {
  config_path: String,    // absolute path, used as the key to find prior runs
  timestamp:   u64,       // unix seconds
  p50:  u128,
  p95:  u128,
  p99:  u128,
  p999: u128,
  total:        usize,
  success_rate: f64,
}
```

Serialize as JSON. File name: `~/.blast/history/{timestamp}_{config_hash}.json` where `config_hash` is the first 8 chars of a hash of the absolute config path string (keeps entries per-config without collisions).

**Step 2 — save and load**

```
fn history_dir() -> PathBuf:
  dirs::home_dir()?.join(".blast").join("history")
  // create if not exists

fn save(record: &HistoryRecord) -> Result<()>:
  path = history_dir().join(format!("{}_{}.json", record.timestamp, config_hash))
  fs::write(path, serde_json::to_string(record)?)

fn load_last(config_path: &str) -> Option<HistoryRecord>:
  // read all files in history_dir()
  // filter to those whose config_path field matches
  // return the one with the largest timestamp
```

**Step 3 — diff and print**

```
fn diff_print(prev: &HistoryRecord, curr: &HistoryRecord):
  println!("compared to last run:")
  for (label, prev_val, curr_val) in [("p50", prev.p50, curr.p50), ("p99", prev.p99, curr.p99), ...]:
    delta_pct = (curr_val as f64 - prev_val as f64) / prev_val as f64 * 100.0
    arrow = if delta_pct > 0 { "▲".red() } else { "▼".green() }
    println!("  {}  {}ms → {}ms ({:+.0}%) {}", label, prev_val, curr_val, delta_pct, arrow)
```

New dep needed: `dirs` crate for `home_dir()`.

---

## 14. Cookie jar

### Why

Some APIs authenticate with session cookies rather than bearer tokens. The current runner builds a `Client` without cookie persistence, so even if a login endpoint sets a `Set-Cookie` header, the cookie is silently dropped and every subsequent request arrives unauthenticated. There is no workaround — the `extract` mechanism only handles JSON body fields.

### Result

Cookie persistence is automatic. Any `Set-Cookie` header from a setup endpoint is stored in the client's cookie jar and replayed on all subsequent requests. No config change needed — it just works when the API uses cookies.

### How

**What needs to change**

Only the `Client` construction in each command that creates one (`check.rs`, `seed.rs`, `run.rs`, `stress.rs`). One flag added to the builder.

**Step 1 — enable cookie store on the client**

```
// everywhere a Client is built, change:
Client::builder()
  .timeout(Duration::from_secs(30))
  .build()?

// to:
Client::builder()
  .timeout(Duration::from_secs(30))
  .cookie_store(true)    // reqwest persists cookies across requests on the same Client
  .build()?
```

Because `load_setup()` receives the same `&Client` that the run loop uses, cookies set during setup are automatically present on every load request. No changes to `runner::execute()`, `template.rs`, or `extractor.rs`.

The only edge case: `seed` creates many concurrent tasks each using the same `Arc<Client>`. reqwest's cookie store is thread-safe, so this is safe. All seed iterations share the same jar, which is the correct behaviour (they share the same authenticated session).

---

## 15. Multi-stage load profile

### Why

`stress` ramps linearly and stops at the breaking point. `run` holds a fixed RPS. Neither can model a realistic production traffic curve: ramp up slowly, hold at peak for several minutes, then ramp down. Defining this as a config-level construct means it's reproducible, version-controlled, and can be shared across the team.

### Result

`x-blast-stages` in the OpenAPI spec (or `"stages"` top-level field in `blast.config.json`) defines an ordered list of load steps. Each step has a target RPS and a duration. blast ramps linearly between consecutive steps and prints per-step stats. A new `blast stage` command (or reuse `blast stress`) executes it.

```json
"x-blast-stages": [
  { "rps": 10,  "duration": 30  },
  { "rps": 100, "duration": 120 },
  { "rps": 50,  "duration": 60  },
  { "rps": 0,   "duration": 30  }
]
```

### How

**What needs to change**

- `src/config.rs` — add `stages: Option<Vec<Stage>>` to `BlastConfig`; `Stage { rps: u64, duration: u64 }`
- `src/openapi.rs` — map `x-blast-stages` from `info` level in the converter
- `src/main.rs` — add `Stage` subcommand (no args, stages come from config)
- `src/commands/stage.rs` — new file

**Step 1 — Stage struct and config field**

```
struct Stage {
  rps:      u64,
  duration: u64,   // seconds
}

BlastConfig:
  ...existing fields...
  stages: Option<Vec<Stage>>
```

**Step 2 — stage.rs execution**

```
pub async fn run(config_path: &Path) -> Result<()>:
  config    = BlastConfig::load(config_path)?
  stages    = config.stages.context("no stages defined in config")?
  endpoints = config.endpoint_for("stress")   // reuse stress tag, or a new "stage" tag
  client    = Client::builder().cookie_store(true).timeout(30s).build()?
  ctx       = config.load_setup(&client).await?

  let mut all_step_stats: Vec<Stats> = Vec::new()

  for (i, stage) in stages.iter().enumerate():
    println!("stage {}: {} req/s for {}s", i+1, stage.rps, stage.duration)

    // linear ramp from previous stage's RPS (or 0 for first) to stage.rps
    // if prev_rps == stage.rps: no ramp, hold immediately
    // if stage.rps == 0: drain existing requests, wait out duration, print cooldown

    let mut stats = Stats::new()
    // fire loop identical to stress.rs but using stage.rps and stage.duration
    // collect into stats

    stats.print_step_row(stage.rps)   // reuse from stat.rs
    all_step_stats.push(stats)

  // print final summary table across all stages
  // (same structure as stress.rs final table)
```

The ramp between stages works by computing the interval_ms at the start of each tick within a short transition window (e.g. the first 5 seconds of a stage), then locking to the target interval for the remainder. Similar to the ramp-up feature in `run`.

---

## Implementation order

1. **stat.rs** first — self-contained, no new dependencies, immediately cleans up duplication. Good warmup.

2. **OpenAPI spec** second. Within this feature, work in this order:
   - `config.rs`: structs → converter → `load()` → `load_raw()` → `openapi_template()` → `create()`
   - `blast.config.json` → rename to `openapi.json`, rewrite as OpenAPI
   - `commands/init.rs`: update the printed message
   - `commands/validate.rs`: optionally show detected format in header
   - `main.rs`: update `--config` description, switch to compile-time version
   - `README.md`: rewrite Configuration section

   `check.rs`, `seed.rs`, `run.rs`, `stress.rs` need no changes.

3. **Cookie jar** — one-line change to each Client builder, do immediately after OpenAPI since it's trivial and unblocks teams who need it.

4. **`{{env.VAR}}`** — one function in template.rs, no deps.

5. **Variable file (`--vars`)** — pairs naturally with env vars, do together.

6. **Mock server** — needs axum (new dep), benefits from `load_raw()` added in step 2.

7. **`blast trace`** — new command, extends runner. Do after the codebase has stabilised from OpenAPI changes.

8. **`x-blast-weight`** — one new field, one helper. Do after OpenAPI since the field lives in the spec.

9. **Body assertions** — builds on the extractor. Do after OpenAPI since `x-blast-assert` lives on operations.

10. **Ramp-up on `run`** — self-contained change to run.rs once stat.rs is done.

11. **Scenario mode** — builds on config and runner. Do after OpenAPI and cookie jar are stable.

12. **Threshold assertions** — builds on stat.rs. Do after stat.rs is solid.

13. **Structured output** — do alongside threshold assertions, both relate to post-run consumption.

14. **Multi-stage load profile** — most complex new command. Do after scenario mode and ramp-up are working, since stage.rs borrows patterns from both.

15. **`blast history`** — do last. Depends on structured output (needs the JSON shape to be stable) and adds the `dirs` crate dependency.

16. **Fake data engine** — already shipped. Listed here for completeness; no implementation work remaining.

17. **Request chaining** — already shipped. Listed here for completeness; no implementation work remaining.

18. **HTML report** — do after structured output and stat.rs are stable. Depends on the JSON shape produced by `to_json()` since the template reads from it.

---

## 16. Fake data engine

### Why

Hardcoded request bodies create brittle tests. Using the same email or user ID in every request causes uniqueness constraint failures, pollutes the database with predictable fixture data, and means a seed run that creates 500 users all have the same username. Tests should generate realistic, varied data on every run — without the engineer writing a data factory.

### Result

`{{fake.email}}`, `{{fake.uuid}}`, `{{fake.name}}` and 14 other placeholders work anywhere in a request body, header value, or URL path. Each request resolves them fresh, so 500 concurrent seed requests each get a unique email address. Placeholders can be mixed with literal text: `"user-{{fake.uuid}}@example.com"` produces a valid unique address every time.

Supported generators:

| Placeholder | Output |
|---|---|
| `fake.email` | `ada.lovelace@freemail.dev` |
| `fake.username` | `ada_lovelace42` |
| `fake.password` | 8–16 char random string |
| `fake.url` | domain suffix string |
| `fake.name` | full name |
| `fake.firstname` | first name |
| `fake.lastname` | last name |
| `fake.word` | single lorem word |
| `fake.sentence` | 3–8 word sentence |
| `fake.paragraph` | 1–3 sentence paragraph |
| `fake.company` | company name |
| `fake.city` | city name |
| `fake.country` | country name |
| `fake.uuid` | v4 UUID string |

Unknown placeholders warn to stderr and are left unchanged so the user notices rather than silently sending a broken request.

### Pseudo code

```
// src/template.rs

pub type Context = HashMap<String, String>

// entry points — called by every command before each request
pub fn resolve(value: &Value, ctx: &Context) -> Value
  // recursively walks the JSON value tree
  // Value::String(s) => Value::String(resolve_str(s, ctx))
  // Value::Object(map) => rebuild map with each value resolved
  // Value::Array(arr) => rebuild array with each element resolved
  // other => clone unchanged

pub fn resolve_map(map: &HashMap<String,String>, ctx: &Context) -> HashMap<String,String>
  // used for headers — same logic but over a flat string map

// internal
fn resolve_str(s: &str, ctx: &Context) -> String
  if s == "{{key}}"  (whole string is one placeholder):
    return resolve_key(trimmed_key, ctx)
  elif s contains "{{":
    return resolved_mixed(s, ctx)   // handles mixed literal+placeholder
  else:
    return s unchanged

fn resolved_mixed(s: &str, ctx: &Context) -> String
  // walk the string left to right
  // copy literal segments to result
  // when "{{" found, find matching "}}", resolve the key, append
  // if "{{" has no matching "}}", copy remainder and return

fn resolve_key(key: &str, ctx: &Context) -> String
  // 1. check ctx first — extracted values and --vars override fakes
  if let Some(val) = ctx.get(key): return val.clone()

  // 2. dispatch to the fake library
  match key:
    "fake.email"     => faker::internet::en::FreeEmail().fake()
    "fake.username"  => faker::internet::en::Username().fake()
    "fake.password"  => faker::internet::en::Password(8..16).fake()
    "fake.url"       => faker::internet::en::DomainSuffix().fake()
    "fake.name"      => faker::name::en::Name().fake()
    "fake.firstname" => faker::name::en::FirstName().fake()
    "fake.lastname"  => faker::name::en::LastName().fake()
    "fake.word"      => faker::lorem::en::Word().fake()
    "fake.sentence"  => faker::lorem::en::Sentence(3..8).fake()
    "fake.paragraph" => faker::lorem::en::Paragraph(1..3).fake()
    "fake.company"   => faker::company::en::CompanyName().fake()
    "fake.city"      => faker::address::en::CityName().fake()
    "fake.country"   => faker::address::en::CountryName().fake()
    "fake.uuid"      => uuid::Uuid::new_v4().to_string()

  // 3. unknown — warn and leave unchanged so the user notices
    _ =>
      eprintln!("warning: unknown placeholder {{{{{}}}}} — left unchanged", key)
      format!("{{{{{}}}}}", key)
```

**Crate dependencies**

- `fake` — the data generator library. Each `faker::*` module maps to a category.
- `uuid` — v4 UUID generation (not covered by the `fake` crate's UUID output format).

---

## 17. Request chaining

### Why

Real API flows are stateful. You cannot load-test a "fetch order" endpoint in isolation — you first need an order ID, which comes from a "create order" response. Without chaining, teams work around this by hardcoding known IDs (brittle, environment-specific) or running a manual setup step before blast (error-prone). Chaining lets the spec itself describe the dependency: extract the ID from response A and inject it into request B.

### Result

`x-blast-extract` on an OpenAPI operation maps dot-path expressions to context variable names. After a request completes successfully, blast walks the response body along each dot-path and stores the value in the shared context. Any subsequent request in the same run can reference that variable as `{{variable_name}}`.

Example spec:

```json
"post": {
  "operationId": "login",
  "x-blast-extract": {
    "auth_token": "data.token",
    "user_id":    "data.user.id"
  }
}
```

After login succeeds, `{{auth_token}}` and `{{user_id}}` are available to every later request in the run via the template engine. Chaining works across the setup phase too — setup endpoints run first, extract their values, and the results flow into the main load loop.

Dot-path syntax supports:
- `data.token` — nested object traversal
- `items.0.id` — array index access (`0` parses as usize)
- Any combination: `results.0.meta.created_at`

Values that are objects or arrays are skipped with a warning — only scalars (string, number, bool) are extracted.

### Pseudo code

```
// src/extractor.rs

pub type Context = HashMap<String, String>

// called after every successful request that has extract rules
pub fn extract(body: &Value, rules: &HashMap<String, String>, ctx: &mut Context)
  for (var_name, path) in rules:
    match get_path(body, path):
      None =>
        eprintln!("warning: path \"{}\" not found — \"{}\" not set", path, var_name)

      Some(Value::String(s)) => ctx.insert(var_name, s.clone())
      Some(Value::Number(n)) => ctx.insert(var_name, n.to_string())
      Some(Value::Bool(b))   => ctx.insert(var_name, b.to_string())
      Some(_) =>
        eprintln!("warning: path \"{}\" is object/array — skipped", path)

// navigate a JSON value by dot-separated path segments
fn get_path<'a>(value: &'a Value, path: &str) -> Option<&'a Value>
  current = value
  for segment in path.split('.'):
    current = match current:
      Value::Object(map) => map.get(segment)?
      Value::Array(arr)  => arr.get(segment.parse::<usize>().ok()?)?
      _                  => return None
  Some(current)
```

**Integration with commands**

Every command that fires requests initialises a `Context` before the loop. The setup phase (`load_setup`) runs first and populates ctx with any extracted values. The main loop calls `template::resolve(body, &ctx)` to expand placeholders before sending, and calls `extractor::extract(&response_body, &endpoint.extract, &mut ctx)` after a successful response to capture new values.

The context is shared across all requests within a single run. In `run` and `stress`, multiple tokio tasks share the same `Arc<Mutex<Context>>` — extraction from one in-flight request is visible to subsequent requests once the lock is released.

---

## 18. HTML report (`--output html`)

### Why

JSON output from `--output json` is machine-readable but not human-readable outside a terminal session. After a CI run or a load test in a staging environment, the engineer often wants to share the results with teammates or compare two runs visually without writing a script. A self-contained HTML file that opens in any browser — no server, no dependencies — gives a shareable artifact that requires nothing to view.

### Result

`blast run --output html > report.html` writes a single self-contained HTML file to stdout. Opening it locally shows:

- A header with the config file name, date/time, target RPS, and duration
- A summary bar: total requests, pass rate, and the four key latency percentiles (p50 / p95 / p99 / p999)
- A bar chart of per-second request counts overlaid with a p99 latency line (rendered with inline SVG — no JS charting library)
- A per-endpoint breakdown table: endpoint name, total calls, pass rate, p50, p99
- Color-coded pass/fail rows (green tint for >99% pass rate, red tint for failures)
- All CSS and SVG inlined; the file is fully self-contained with no external assets

Works for both `run` and `stress`. For `stress`, the chart shows one bar group per RPS step instead of per second.

### How

**What needs to exist**

- `templates/report.html` — a Handlebars-style template with `{{variable}}` and `{{#each}}` placeholders
- `src/report.rs` — a tiny template renderer and the data structs that back the template
- `src/commands/run.rs` and `src/commands/stress.rs` — branch on `--output html` and call `report::render()`

The renderer does NOT need a full Handlebars crate. It only needs to handle:
- `{{variable}}` — simple string substitution
- `{{#each items}} ... {{name}} ... {{/each}}` — flat array iteration with field access

A 50-line recursive string replacement function handles both cases.

**Pseudo code**

```
// src/report.rs

pub struct ReportData {
    config_path:   String,
    generated_at:  String,    // human-readable timestamp passed in from the caller
    target_rps:    u64,
    duration_secs: u64,
    total:         usize,
    passed:        usize,
    success_rate:  f64,
    p50:  u128,
    p95:  u128,
    p99:  u128,
    p999: u128,
    // per-second buckets for the chart (run mode only)
    buckets: Vec<BucketRow>,
    // per-endpoint stats
    endpoints: Vec<EndpointRow>,
}

pub struct BucketRow {
    second:    u64,
    count:     usize,
    p99_ms:    u128,
}

pub struct EndpointRow {
    name:         String,
    total:        usize,
    passed:       usize,
    success_rate: f64,
    p50:  u128,
    p99:  u128,
}

// assemble ReportData from Stats + the per-endpoint breakdown
pub fn from_stats(stats: &Stats, ...) -> ReportData

// load templates/report.html (embedded at compile time via include_str!)
// substitute all {{var}} and {{#each}} blocks
// return the rendered HTML string
pub fn render(data: &ReportData) -> String:

    template = include_str!("../templates/report.html")

    // phase 1: substitute scalar fields
    rendered = template
        .replace("{{config_path}}",   &data.config_path)
        .replace("{{generated_at}}",  &data.generated_at)
        .replace("{{target_rps}}",    &data.target_rps.to_string())
        ...

    // phase 2: expand {{#each buckets}} blocks
    rendered = expand_each_block(rendered, "buckets", &data.buckets, |row| {
        HashMap from ("second" → row.second, "count" → row.count, ...)
    })

    // phase 3: expand {{#each endpoints}} blocks
    rendered = expand_each_block(rendered, "endpoints", &data.endpoints, |row| {
        HashMap from ("name" → row.name, "total" → row.total, ...)
    })

    rendered

// helper
fn expand_each_block(
    src:      String,
    key:      &str,
    items:    &[impl ToHashMap],
    to_map:   impl Fn(&T) -> HashMap<&str, String>
) -> String:
    start_tag = format!("{{{{#each {}}}}}", key)
    end_tag   = "{{/each}}"

    // find the block between start_tag and end_tag
    // for each item: clone the block, replace {{field}} with map values
    // join all rendered copies, replace the original block with the joined string
```

**templates/report.html skeleton**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>blast report — {{config_path}}</title>
  <style>
    /* all styles inline — dark theme matching CLI colors */
    body   { background: #09090b; color: #fafafa; font-family: monospace; margin: 0; padding: 2rem; }
    h1     { font-size: 1.5rem; font-weight: 800; letter-spacing: -0.04em; }
    .meta  { color: #71717a; font-size: 0.875rem; margin-bottom: 2rem; }
    .stats { display: flex; gap: 2rem; margin-bottom: 2rem; }
    .stat  { background: #111113; border: 1px solid #1c1c1f; border-radius: 8px; padding: 1rem 1.5rem; }
    .stat-label { font-size: 0.75rem; color: #52525b; text-transform: uppercase; letter-spacing: 0.08em; }
    .stat-value { font-size: 1.75rem; font-weight: 700; letter-spacing: -0.03em; }
    /* chart */
    .chart-wrap { background: #111113; border: 1px solid #1c1c1f; border-radius: 8px; padding: 1rem; margin-bottom: 2rem; overflow-x: auto; }
    /* table */
    table { width: 100%; border-collapse: collapse; }
    th    { text-align: left; font-size: 0.75rem; color: #52525b; text-transform: uppercase; letter-spacing: 0.08em; padding: 0.5rem 0.75rem; border-bottom: 1px solid #1c1c1f; }
    td    { padding: 0.5rem 0.75rem; font-size: 0.875rem; border-bottom: 1px solid #111113; }
    .pass { color: #86efac; }
    .fail { color: #fca5a5; }
  </style>
</head>
<body>
  <h1>blast</h1>
  <p class="meta">{{config_path}} · {{generated_at}} · {{target_rps}} req/s · {{duration_secs}}s</p>

  <div class="stats">
    <div class="stat"><div class="stat-label">Total</div><div class="stat-value">{{total}}</div></div>
    <div class="stat"><div class="stat-label">Pass rate</div><div class="stat-value">{{success_rate}}%</div></div>
    <div class="stat"><div class="stat-label">p50</div><div class="stat-value">{{p50}}ms</div></div>
    <div class="stat"><div class="stat-label">p95</div><div class="stat-value">{{p95}}ms</div></div>
    <div class="stat"><div class="stat-label">p99</div><div class="stat-value">{{p99}}ms</div></div>
    <div class="stat"><div class="stat-label">p999</div><div class="stat-value">{{p999}}ms</div></div>
  </div>

  <!-- SVG bar chart generated from per-second buckets -->
  <div class="chart-wrap">
    <svg width="100%" height="120" viewBox="0 0 {{chart_width}} 120" preserveAspectRatio="none">
      {{#each buckets}}
      <rect x="{{bar_x}}" y="{{bar_y}}" width="{{bar_w}}" height="{{bar_h}}" fill="#f97316" opacity="0.7" />
      {{/each}}
    </svg>
  </div>

  <table>
    <thead>
      <tr><th>Endpoint</th><th>Calls</th><th>Pass rate</th><th>p50</th><th>p99</th></tr>
    </thead>
    <tbody>
      {{#each endpoints}}
      <tr>
        <td>{{name}}</td>
        <td>{{total}}</td>
        <td class="{{pass_class}}">{{success_rate}}%</td>
        <td>{{p50}}ms</td>
        <td>{{p99}}ms</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
</body>
</html>
```

**Integration with run.rs and stress.rs**

```
// in run.rs, after stats are computed:
match output:
    OutputFormat::Terminal => stats.print_summary(duration)
    OutputFormat::Json     => println!("{}", serde_json::to_string_pretty(&stats.to_json(duration))?)
    OutputFormat::Html     =>
        let data = report::from_stats(&stats, &config, target_rps, duration, &generated_at)
        print!("{}", report::render(&data))   // caller redirects stdout to a file
```

No new crate dependencies needed. `include_str!` embeds the template at compile time so the binary is self-contained.

**Chart SVG generation**

The bar chart is not rendered by the template — it is computed in `report::from_stats()` before passing data to the template. Each `BucketRow` carries pre-computed `bar_x`, `bar_y`, `bar_w`, `bar_h` values in SVG coordinate space (0 0 {total_seconds * BAR_STRIDE} 120). The template just iterates and stamps them in. This keeps the template logic-free.

```
fn compute_buckets(results: &[RequestResult], duration_secs: u64) -> Vec<BucketRow>:

    BAR_W     = 10
    BAR_GAP   = 2
    BAR_STRIDE = BAR_W + BAR_GAP
    MAX_HEIGHT = 100    // px, leaves 20px for p99 line

    // group results by floor(latency_start / 1000ms) → bucket index
    buckets: Vec<Vec<u128>> = vec![vec![]; duration_secs as usize]
    for result in results:
        idx = (result.started_at_ms / 1000).min(duration_secs - 1)
        buckets[idx].push(result.latency_ms)

    max_count = buckets.iter().map(|b| b.len()).max().unwrap_or(1)

    buckets.iter().enumerate().map(|(i, times)|:
        count  = times.len()
        p99_ms = percentile(times, 99)
        height = (count as f64 / max_count as f64 * MAX_HEIGHT as f64) as u64
        bar_x  = i as u64 * BAR_STRIDE
        bar_y  = MAX_HEIGHT - height
        BucketRow { second: i as u64, count, p99_ms, bar_x, bar_y, bar_w: BAR_W, bar_h: height }
    ).collect()
```
