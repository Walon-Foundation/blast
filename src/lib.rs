//! Blast as a library crate.
//!
//! This exposes Blast's internals so they can be shared by the CLI (`src/main.rs`)
//! and the NAPI-RS bindings (`src/napi.rs`). Command modules are being refactored
//! so the work lives in pure functions that return structured results (no stdout,
//! no `process::exit`), with printing kept in the CLI layer. `check` is done;
//! `run`/`seed`/`stress` are in progress.

pub mod commands;
pub mod config;
pub mod error;
pub mod extractor;
pub mod runner;
pub mod template;

pub use error::BlastError;
pub use runner::RequestResult;

// Pure, structured-result entry points for embedders (CLI + NAPI).
pub use commands::check::{CheckResult, run_check};
pub use commands::run::{RunConfig, RunProgress, RunResult, run_load_test};
pub use commands::seed::{SeedConfig, SeedResult, run_seed};
pub use commands::stress::{StressConfig, StressProgress, StressResult, StressStep, run_stress};

// NAPI binding layer. Lives in src/napi.rs but is exposed as `napi_bindings`
// to avoid clashing with the `napi` crate name. Only compiled under the `node`
// feature — a plain `cargo build` (CLI binary) must not link the `napi_*`
// symbols, which have no resolver outside a Node runtime.
#[cfg(feature = "node")]
#[path = "napi.rs"]
pub mod napi_bindings;
