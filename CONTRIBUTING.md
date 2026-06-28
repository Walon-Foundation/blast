# Contributing to Blast

Thanks for your interest in contributing! Bug reports, feature requests, docs improvements, and code are all welcome.

## Getting started

1. Fork the repo and clone your fork.
2. Build with `cargo build` (requires a recent stable Rust toolchain).
3. Run the bundled example: `cargo run -- validate`.

## Before opening a PR

- Keep changes focused — one feature or fix per PR.
- Make sure the project compiles cleanly:

  ```sh
  cargo check
  cargo clippy
  cargo test
  cargo fmt --check
  ```

- If the change affects user-facing behaviour, update the [docs site](https://github.com/Walon-Foundation/blast/tree/main/web) in the same PR.

## Commit style

Use clear, imperative commit messages, ideally following [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add weight field for traffic distribution
fix: handle missing body in extract
docs: clarify mock_response behaviour
```

## Reporting bugs

Open an issue with the command you ran, the full output, and your `blast.config.json` (redact secrets).

## Security issues

**Do not** open public issues — see [SECURITY.md](SECURITY.md) for the responsible disclosure process.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
