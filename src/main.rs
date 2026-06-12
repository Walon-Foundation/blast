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
        }
    }

    Ok(())
}