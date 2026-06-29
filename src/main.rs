use anyhow::Result;
use clap::{Parser, Subcommand};
use std::path::PathBuf;

mod commands;
mod config;
mod extractor;
mod runner;
mod stat;
mod template;

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
    },

    /// Create a mock server for frontend developers to build ui quickly
    Mock {
        #[arg(long, default_value = "3000")]
        port: u16,

        #[arg(long, default_value = "0")]
        delay: u16,
    },
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

        Command::Run { rps, duration } => {
            commands::run::run(&cli.config, rps, duration, cli.vars.as_deref()).await?;
        }

        Command::Stress {
            min_rps,
            max_rps,
            step,
            step_duration,
        } => {
            commands::stress::run(
                &cli.config,
                min_rps,
                max_rps,
                step,
                step_duration,
                cli.vars.as_deref(),
            )
            .await?;
        }

        Command::Mock { port, delay } => {
            commands::mock::run(&cli.config, port, delay).await?;
        }
    }

    Ok(())
}
