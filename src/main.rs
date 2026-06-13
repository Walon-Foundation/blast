use std::path::PathBuf;
use anyhow::Result;
use clap:: {Parser, Subcommand};

mod commands;
mod config;
mod runner;
mod template;
mod extractor;

#[derive(Parser, Debug)]
#[command(version = "0.1.0", name = "blast", about = "API load tester and traffic generator")]
struct Cli {
    /// Path to the blast.config.json (default: current directory)
    #[arg(short, long, global = true, default_value = ".")]
    config:PathBuf,

    #[command(subcommand)]
    command:Command,
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
        concurrency: usize
    }
}

#[tokio::main]
async fn main() -> Result<()>{
    let cli = Cli::parse();

    match cli.command {
        Command::Init { path } => {
            commands::init::run(&path)?;
        },

        Command::Check => {
            commands::check::run(&cli.config).await?;
        },

        Command::Validate => {
            commands::validate::run(&cli.config)?;
        },

        Command::Seed { count, concurrency } => {
            commands::seed::run(&cli.config, count, concurrency).await?;
        }
    }

    Ok(())
}