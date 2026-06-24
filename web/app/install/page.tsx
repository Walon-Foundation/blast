"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";

/* ── Types ─────────────────────────────────────────── */

type OS = "linux" | "mac" | "windows";
type Platform = "linux-x64" | "linux-arm64" | "mac-arm64" | "windows-x64";

/* ── OS detection ──────────────────────────────────── */

function detectOS(): OS {
  if (typeof navigator === "undefined") return "linux";
  const ua = navigator.userAgent.toLowerCase();
  const platform = (navigator.platform ?? "").toLowerCase();
  if (ua.includes("win") || platform.includes("win")) return "windows";
  if (ua.includes("mac") || platform.includes("mac")) return "mac";
  return "linux";
}

/* ── Copy button ───────────────────────────────────── */

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  }
  return (
    <button
      onClick={copy}
      aria-label="Copy"
      style={{
        flexShrink: 0,
        height: 28,
        width: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "none",
        border: "1px solid #27272a",
        borderRadius: 6,
        color: done ? "#86efac" : "#52525b",
        cursor: "pointer",
        transition: "border-color 0.15s, color 0.15s",
      }}
      className="copy-btn"
    >
      {done ? (
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 7l3.5 3.5L12 3" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="5" width="8" height="8" rx="1.5" />
          <path d="M9 5V3.5A1.5 1.5 0 007.5 2H3.5A1.5 1.5 0 002 3.5v4A1.5 1.5 0 003.5 9H5" />
        </svg>
      )}
    </button>
  );
}

/* ── Code block ────────────────────────────────────── */

function CodeBox({ label, cmd, prompt = "$" }: { label: string; cmd: string; prompt?: string }) {
  return (
    <div
      style={{
        border: "1px solid #1c1c1f",
        borderRadius: 10,
        overflow: "hidden",
        marginBottom: "1rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.5rem 1rem",
          borderBottom: "1px solid #1c1c1f",
          background: "#111113",
        }}
      >
        <span style={{ fontSize: "0.75rem", color: "#52525b", fontFamily: "var(--font-mono)", letterSpacing: "0.02em" }}>
          {label}
        </span>
        <CopyButton text={cmd} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "1rem 1.125rem", background: "#0a0a0c" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "#3f3f46", flexShrink: 0 }}>
          {prompt}
        </span>
        <code
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.8125rem",
            color: "#d4d4d8",
            flex: 1,
            wordBreak: "break-all",
          }}
        >
          {cmd}
        </code>
      </div>
    </div>
  );
}

/* ── Platform table row ────────────────────────────── */

function PlatformRow({
  platform,
  triple,
  note,
  highlight = false,
}: {
  platform: string;
  triple: string;
  note: string;
  highlight?: boolean;
}) {
  return (
    <tr style={{ borderBottom: "1px solid #111113" }}>
      <td
        style={{
          padding: "0.75rem 1rem",
          fontSize: "0.875rem",
          color: highlight ? "#fafafa" : "#a1a1aa",
          fontWeight: highlight ? 500 : 400,
          verticalAlign: "top",
        }}
      >
        {platform}
        {highlight && (
          <span
            style={{
              marginLeft: "0.5rem",
              fontSize: "0.6rem",
              fontWeight: 700,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: "#f97316",
              background: "rgba(249,115,22,0.08)",
              border: "1px solid rgba(249,115,22,0.18)",
              borderRadius: 4,
              padding: "0.1rem 0.35rem",
              verticalAlign: "middle",
            }}
          >
            your system
          </span>
        )}
      </td>
      <td
        style={{
          padding: "0.75rem 1rem",
          fontFamily: "var(--font-mono)",
          fontSize: "0.8125rem",
          color: "#52525b",
          verticalAlign: "top",
        }}
      >
        {triple}
      </td>
      <td
        style={{
          padding: "0.75rem 1rem",
          fontSize: "0.8125rem",
          color: "#52525b",
          verticalAlign: "top",
          lineHeight: 1.5,
        }}
      >
        {note}
      </td>
    </tr>
  );
}

const up: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

/* ── Page ──────────────────────────────────────────── */

export default function InstallPage() {
  const [os, setOS] = useState<OS>("linux");

  useEffect(() => {
    setOS(detectOS());
  }, []);

  const platformHighlight: Record<OS, Platform> = {
    linux: "linux-x64",
    mac: "mac-arm64",
    windows: "windows-x64",
  };
  const detected = platformHighlight[os];

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "4rem 1.5rem 6rem" }}>
      {/* Breadcrumb */}
      <Link
        href="/"
        style={{
          fontSize: "0.8125rem",
          color: "#3f3f46",
          textDecoration: "none",
          display: "inline-block",
          marginBottom: "2.5rem",
          transition: "color 0.15s",
        }}
        className="back-link"
      >
        ← Home
      </Link>

      <motion.div
        initial="hidden"
        animate="show"
        variants={stagger}
      >
        {/* Header */}
        <motion.div variants={up} style={{ marginBottom: "3rem" }}>
          <p
            style={{
              fontSize: "0.6875rem",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#3f3f46",
              marginBottom: "0.875rem",
            }}
          >
            Installation
          </p>
          <h1
            style={{
              fontSize: "clamp(2rem, 4vw, 2.75rem)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: "#fafafa",
              lineHeight: 1.1,
              marginBottom: "0.875rem",
            }}
          >
            Get blast running
          </h1>
          <p style={{ fontSize: "1rem", color: "#71717a", lineHeight: 1.7, maxWidth: 480 }}>
            Pre-built binaries for all major platforms. No Rust or compiler needed for the
            one-liner install.
          </p>
        </motion.div>

        {/* ── Quick install ─────────────────────────────── */}
        <motion.section variants={up} style={{ marginBottom: "3.5rem" }}>
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              color: "#fafafa",
              marginBottom: "1rem",
              letterSpacing: "-0.015em",
            }}
          >
            Linux & macOS
          </h2>
          <CodeBox
            label="sh"
            cmd="curl -fsSL https://raw.githubusercontent.com/Walon-Foundation/blast/main/install.sh | sh"
          />
          <p style={{ fontSize: "0.8125rem", color: "#3f3f46", lineHeight: 1.6 }}>
            Auto-detects OS and architecture. Installs to <code style={{ fontFamily: "var(--font-mono)", color: "#52525b" }}>~/.local/bin</code>.
            Set <code style={{ fontFamily: "var(--font-mono)", color: "#52525b" }}>BLAST_INSTALL_DIR</code> to override the destination.
          </p>
        </motion.section>

        <motion.section variants={up} style={{ marginBottom: "3.5rem" }}>
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              color: "#fafafa",
              marginBottom: "1rem",
              letterSpacing: "-0.015em",
            }}
          >
            Windows
          </h2>
          <CodeBox
            label="PowerShell"
            prompt="PS>"
            cmd="irm https://raw.githubusercontent.com/Walon-Foundation/blast/main/install.ps1 | iex"
          />
          <p style={{ fontSize: "0.8125rem", color: "#3f3f46", lineHeight: 1.6 }}>
            Downloads the <code style={{ fontFamily: "var(--font-mono)", color: "#52525b" }}>x86_64-pc-windows-msvc</code> binary
            and adds it to your user PATH automatically.
          </p>
        </motion.section>

        {/* ── Build from source ─────────────────────────── */}
        <motion.section variants={up} style={{ marginBottom: "3.5rem" }}>
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              color: "#fafafa",
              marginBottom: "1rem",
              letterSpacing: "-0.015em",
            }}
          >
            Build from source
          </h2>
          <CodeBox label="sh" cmd="cargo install --git https://github.com/Walon-Foundation/blast" />
          <p style={{ fontSize: "0.8125rem", color: "#3f3f46", lineHeight: 1.6 }}>
            Requires Rust 1.75 or later. Run{" "}
            <code style={{ fontFamily: "var(--font-mono)", color: "#52525b" }}>rustup update stable</code>{" "}
            if you need to upgrade.
          </p>
        </motion.section>

        {/* ── Platform matrix ───────────────────────────── */}
        <motion.section variants={up} style={{ marginBottom: "3.5rem" }}>
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              color: "#fafafa",
              marginBottom: "1rem",
              letterSpacing: "-0.015em",
            }}
          >
            Supported platforms
          </h2>

          <div
            style={{
              border: "1px solid #1c1c1f",
              borderRadius: 10,
              overflow: "hidden",
              marginBottom: "1rem",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1c1c1f", background: "#111113" }}>
                  {["Platform", "Target triple", "Notes"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "0.5rem 1rem",
                        textAlign: "left",
                        fontSize: "0.6875rem",
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "#3f3f46",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <PlatformRow
                  platform="Linux x86-64"
                  triple="x86_64-unknown-linux-gnu"
                  note="glibc 2.17+. Works on Ubuntu 20.04+, Debian 11+, RHEL 8+."
                  highlight={detected === "linux-x64"}
                />
                <PlatformRow
                  platform="Linux arm64"
                  triple="aarch64-unknown-linux-gnu"
                  note="Raspberry Pi 4, AWS Graviton, most arm64 cloud instances."
                  highlight={detected === "linux-arm64"}
                />
                <PlatformRow
                  platform="macOS arm64"
                  triple="aarch64-apple-darwin"
                  note="Apple Silicon (M1, M2, M3, M4). macOS 12+ recommended."
                  highlight={detected === "mac-arm64"}
                />
                <PlatformRow
                  platform="Windows x86-64"
                  triple="x86_64-pc-windows-msvc"
                  note="Windows 10/11. MSVC runtime included."
                  highlight={detected === "windows-x64"}
                />
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: "0.8125rem", color: "#3f3f46", lineHeight: 1.6 }}>
            macOS x86-64 is not supported. Use Rosetta 2 (<code style={{ fontFamily: "var(--font-mono)", color: "#52525b" }}>arch -arm64 zsh</code>)
            or the Linux binary via Docker on Intel Macs.
          </p>
        </motion.section>

        {/* ── Manual download ───────────────────────────── */}
        <motion.section variants={up} style={{ marginBottom: "3.5rem" }}>
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              color: "#fafafa",
              marginBottom: "0.75rem",
              letterSpacing: "-0.015em",
            }}
          >
            Manual download
          </h2>
          <p style={{ fontSize: "0.9375rem", color: "#71717a", lineHeight: 1.7, marginBottom: "1rem" }}>
            Grab an archive from GitHub Releases and place the binary anywhere on your <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.85em", color: "#52525b" }}>PATH</code>.
          </p>
          <a
            href="https://github.com/Walon-Foundation/blast/releases"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 40,
              padding: "0 1.125rem",
              background: "#111113",
              border: "1px solid #27272a",
              borderRadius: 8,
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#a1a1aa",
              textDecoration: "none",
              transition: "border-color 0.15s, color 0.15s",
            }}
            className="releases-link"
          >
            GitHub Releases
          </a>
        </motion.section>

        {/* ── Verify ────────────────────────────────────── */}
        <motion.section variants={up} style={{ marginBottom: "3.5rem" }}>
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              color: "#fafafa",
              marginBottom: "1rem",
              letterSpacing: "-0.015em",
            }}
          >
            Verify the install
          </h2>
          <CodeBox label="sh" cmd="blast --version" />
          <p style={{ fontSize: "0.8125rem", color: "#3f3f46", marginBottom: "0.875rem", lineHeight: 1.6 }}>
            If the command is not found, add the install directory to your PATH.
          </p>
          <CodeBox label="sh — add to ~/.bashrc or ~/.zshrc" cmd={`export PATH="$PATH:$HOME/.local/bin"`} />
        </motion.section>

        {/* ── Uninstall ─────────────────────────────────── */}
        <motion.section variants={up}>
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              color: "#fafafa",
              marginBottom: "1rem",
              letterSpacing: "-0.015em",
            }}
          >
            Uninstall
          </h2>
          <CodeBox label="sh" cmd="rm ~/.local/bin/blast" />
          <p style={{ fontSize: "0.8125rem", color: "#3f3f46", lineHeight: 1.6 }}>
            blast writes no config files or databases. Removing the binary is all that is needed.
          </p>
        </motion.section>

        {/* Footer link */}
        <motion.div
          variants={up}
          style={{
            marginTop: "4rem",
            paddingTop: "2rem",
            borderTop: "1px solid #1c1c1f",
            display: "flex",
            gap: "1.5rem",
          }}
        >
          <Link
            href="/docs"
            style={{
              fontSize: "0.875rem",
              color: "#f97316",
              textDecoration: "none",
              transition: "color 0.15s",
            }}
            className="footer-cta"
          >
            Read the docs →
          </Link>
          <a
            href="https://github.com/Walon-Foundation/blast"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "0.875rem",
              color: "#52525b",
              textDecoration: "none",
              transition: "color 0.15s",
            }}
            className="footer-cta-secondary"
          >
            GitHub
          </a>
        </motion.div>
      </motion.div>

      <style>{`
        .back-link:hover { color: #71717a !important; }
        .releases-link:hover { border-color: #3f3f46 !important; color: #fafafa !important; }
        .footer-cta:hover { color: #fb923c !important; }
        .footer-cta-secondary:hover { color: #a1a1aa !important; }
        .copy-btn:hover { border-color: #3f3f46 !important; color: #a1a1aa !important; }
      `}</style>
    </main>
  );
}
