# Blast

**Blast** is a fast, config-driven API load tester, traffic generator, and mock server written in Rust.

Describe your API once in a `blast.config.json` file, then hit every endpoint with a single command — fake data, request chaining, load tests, stress tests, and a built-in mock server, all without writing code.

> Full documentation at **[blast.walonfoundation.com](https://blast.walonfoundation.com/)**

## Quick start

```sh
# Install
curl -fsSL https://raw.githubusercontent.com/Walon-Foundation/blast/main/install.sh | sh

# Create a starter config
blast init

# Validate and check endpoints
blast validate
blast check

# Seed a database with fake data
blast seed --count 50 --concurrency 5

# Load test at a fixed rate
blast run --rps 20 --duration 60

# Stress test — find the breaking point
blast stress --min-rps 10 --max-rps 100 --step 10 --step-duration 15

# Start a mock server from your config
blast mock
```

## Install

Pre-built binaries for Linux (x86_64, arm64), macOS Apple Silicon, and Windows x86_64 — see the [install guide](https://blast.walonfoundation.com/install) or grab the latest from [GitHub Releases](https://github.com/Walon-Foundation/blast/releases).

To build from source:

```sh
git clone https://github.com/Walon-Foundation/blast.git
cd blast
cargo install --path .
```

## Commands

| Command | Description |
| --- | --- |
| `blast init [path]` | Create a starter `blast.config.json` |
| `blast check` | Hit every endpoint once, verify status codes |
| `blast validate` | Validate `blast.config.json` |
| `blast seed` | Seed a database with fake data iterations |
| `blast run` | Fixed-RPS load test with latency percentiles |
| `blast stress` | Ramp RPS and detect the breaking point |
| `blast mock` | Start a local mock server from your config |

## Features

- **Config-driven** — one JSON file, no scripting
- **Fake data** — `{{fake.email}}`, `{{fake.uuid}}`, `{{fake.name}}`, and more
- **Request chaining** — extract values from responses, reuse as `{{variable}}`
- **Load testing** — fixed RPS, live progress, p50/p95/p99/p999 latency
- **Stress testing** — auto-detect the breaking point
- **Mock server** — prototype against realistic responses before the backend exists
- **Setup phase** — run auth/warm-up requests before load tests
- **CI friendly** — non-zero exit code on failure

## License

MIT — see [LICENSE](LICENSE).

---

Built by the [Walon Foundation](https://github.com/Walon-Foundation).
