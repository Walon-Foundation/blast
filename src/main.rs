use anyhow::Result;
use clap::{Parser, Subcommand};
use std::path::PathBuf;

mod assertion;
mod commands;
mod config;
mod extractor;
mod history;
mod runner;
mod stat;
mod template;

#[derive(Debug, Clone, clap::ValueEnum)]
pub enum OutputFormat {
    /// Human-readable terminal output (default)
    Terminal,
    /// JSON object written to stdout
    Json,
}

#[derive(Parser, Debug)]
#[command(
    version,
    name = "blast",
    about = "API load tester and traffic generator"
)]
struct Cli {
    /// Path to the blast.config.json (default: current directory)
    #[arg(short, long, global = true, default_value = ".")]
    config: PathBuf,

    /// Path to a flat JSON file of variables to inject into templates
    #[arg(long, global = true)]
    vars: Option<std::path::PathBuf>,

    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand, Debug)]
enum Command {
    /// Create the blast.config.json in the given directory
    Init {
        #[arg(default_value = ".")]
        path: PathBuf,
    },

    /// Hit every enpoint once and verify status codes
    Check,

    /// Validate blast.config.json and report issues
    Validate,

    /// Run all endpoint with tags "seed" with fake fresh data
    Seed {
        #[arg(long, default_value = "10")]
        count: u32,

        #[arg(short = 'j', long, default_value = "1")]
        concurrency: usize,
    },

    /// Fire loads at fixed request per second for a set duration and print out the response time
    Run {
        #[arg(long, default_value = "10")]
        rps: u32,

        #[arg(long, short = 'd', default_value = "30")]
        duration: u64,

        /// Ramp from 0 to target RPS over this many seconds before measuring (0 = disabled)
        #[arg(long, default_value = "0")]
        ramp_up: u64,

        /// Assertion like "p99<200ms" or "error-rate<1%" — exits non-zero on failure
        #[arg(long = "assert", value_name = "ASSERTION")]
        assert_flags: Vec<String>,

        /// Output format for results
        #[arg(long, value_enum, default_value = "terminal")]
        output: OutputFormat,
    },

    /// Ramps from mins-rps to max-rps in steps, calls the blast run logic for each step
    Stress {
        #[arg(long, default_value = "10")]
        min_rps: u64,

        #[arg(long, default_value = "100")]
        max_rps: u64,

        #[arg(long, default_value = "10")]
        step: u64,

        #[arg(long, default_value = "15")]
        step_duration: u64,

        /// Assertion like "p99<200ms" or "error-rate<1%" — exits non-zero on failure
        #[arg(long = "assert", value_name = "ASSERTION")]
        assert_flags: Vec<String>,

        /// Output format for results
        #[arg(long, value_enum, default_value = "terminal")]
        output: OutputFormat,
    },

    /// Create a mock server for frontend developers to build ui quickly
    Mock {
        #[arg(long, default_value = "3000")]
        port: u16,

        #[arg(long, default_value = "0")]
        delay: u16,
    },

    /// Print the full request and response for a single endpoint
    Trace {
        /// Endpoint name (must match the name field in blast.config.json)
        name: String,
    },

    /// Run a multi-stage load profile defined in the stages field of blast.config.json
    Stage,
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Command::Init { path } => {
            commands::init::run(&path)?;
        }

        Command::Check => {
            commands::check::run(&cli.config, cli.vars.as_deref()).await?;
        }

        Command::Validate => {
            commands::validate::run(&cli.config)?;
        }

        Command::Seed { count, concurrency } => {
            commands::seed::run(&cli.config, count, concurrency, cli.vars.as_deref()).await?;
        }

        Command::Run { rps, duration, ramp_up, assert_flags, output } => {
            commands::run::run(&cli.config, rps, duration, ramp_up, cli.vars.as_deref(), assert_flags, output).await?;
        }

        Command::Stress {
            min_rps,
            max_rps,
            step,
            step_duration,
            assert_flags,
            output,
        } => {
            commands::stress::run(
                &cli.config,
                min_rps,
                max_rps,
                step,
                step_duration,
                cli.vars.as_deref(),
                assert_flags,
                output,
            )
            .await?;
        }

        Command::Mock { port, delay } => {
            commands::mock::run(&cli.config, port, delay).await?;
        }

        Command::Trace { name } => {
            commands::trace::run(&cli.config, &name).await?;
        }

        Command::Stage => {
            commands::stage::run(&cli.config).await?;
        }
    }

    Ok(())
}
