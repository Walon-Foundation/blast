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
      className={`shrink-0 h-7 w-7 flex items-center justify-center bg-transparent border border-rim rounded-md cursor-pointer transition-[border-color,color] duration-150 ${done ? "text-ok" : "text-lo hover:border-mute hover:text-mid"}`}
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
    <div className="border border-line rounded-[10px] overflow-hidden mb-4">
      <div className="flex items-center justify-between px-4 py-2 border-b border-line bg-surface">
        <span className="text-xs text-lo font-mono tracking-[0.02em]">
          {label}
        </span>
        <CopyButton text={cmd} />
      </div>
      <div className="flex items-center gap-[0.625rem] px-[1.125rem] py-4 bg-[#0a0a0c]">
        <span className="font-mono text-[0.8125rem] text-mute shrink-0">
          {prompt}
        </span>
        <code className="font-mono text-[0.8125rem] text-[#d4d4d8] flex-1 break-all">
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
    <tr className="border-b border-surface">
      <td
        className={`px-4 py-3 text-sm align-top ${highlight ? "text-hi font-medium" : "text-mid font-normal"}`}
      >
        {platform}
        {highlight && (
          <span className="ml-2 text-[0.6rem] font-bold tracking-[0.07em] uppercase text-accent bg-accent/8 border border-accent/18 rounded px-[0.35rem] py-[0.1rem] align-middle">
            your system
          </span>
        )}
      </td>
      <td className="px-4 py-3 font-mono text-[0.8125rem] text-lo align-top">
        {triple}
      </td>
      <td className="px-4 py-3 text-[0.8125rem] text-lo align-top leading-[1.5]">
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
    <main className="max-w-[760px] mx-auto px-6 pt-16 pb-24">
      {/* Breadcrumb */}
      <Link
        href="/"
        className="text-[0.8125rem] text-mute no-underline inline-block mb-10 transition-colors duration-150 hover:text-[#71717a]"
      >
        ← Home
      </Link>

      <motion.div
        initial="hidden"
        animate="show"
        variants={stagger}
      >
        {/* Header */}
        <motion.div variants={up} className="mb-12">
          <p className="text-[0.6875rem] font-semibold tracking-[0.12em] uppercase text-mute mb-[0.875rem]">
            Installation
          </p>
          <h1 className="text-[clamp(2rem,4vw,2.75rem)] font-extrabold tracking-[-0.04em] text-hi leading-[1.1] mb-[0.875rem]">
            Get blast running
          </h1>
          <p className="text-base text-[#71717a] leading-[1.7] max-w-[480px]">
            Pre-built binaries for all major platforms. No Rust or compiler needed for the
            one-liner install.
          </p>
        </motion.div>

        {/* ── Quick install ─────────────────────────────── */}
        <motion.section variants={up} className="mb-14">
          <h2 className="text-base font-semibold text-hi mb-4 tracking-[-0.015em]">
            Linux &amp; macOS
          </h2>
          <CodeBox
            label="sh"
            cmd="curl -fsSL https://raw.githubusercontent.com/Walon-Foundation/blast/main/install.sh | sh"
          />
          <p className="text-[0.8125rem] text-mute leading-[1.6]">
            Auto-detects OS and architecture. Installs to <code className="font-mono text-lo">~/.local/bin</code>.
            Set <code className="font-mono text-lo">BLAST_INSTALL_DIR</code> to override the destination.
          </p>
        </motion.section>

        <motion.section variants={up} className="mb-14">
          <h2 className="text-base font-semibold text-hi mb-4 tracking-[-0.015em]">
            Windows
          </h2>
          <CodeBox
            label="PowerShell"
            prompt="PS>"
            cmd="irm https://raw.githubusercontent.com/Walon-Foundation/blast/main/install.ps1 | iex"
          />
          <p className="text-[0.8125rem] text-mute leading-[1.6]">
            Downloads the <code className="font-mono text-lo">x86_64-pc-windows-msvc</code> binary
            and adds it to your user PATH automatically.
          </p>
        </motion.section>

        {/* ── Build from source ─────────────────────────── */}
        <motion.section variants={up} className="mb-14">
          <h2 className="text-base font-semibold text-hi mb-4 tracking-[-0.015em]">
            Build from source
          </h2>
          <CodeBox label="sh" cmd="cargo install --git https://github.com/Walon-Foundation/blast" />
          <p className="text-[0.8125rem] text-mute leading-[1.6]">
            Requires Rust 1.75 or later. Run{" "}
            <code className="font-mono text-lo">rustup update stable</code>{" "}
            if you need to upgrade.
          </p>
        </motion.section>

        {/* ── Platform matrix ───────────────────────────── */}
        <motion.section variants={up} className="mb-14">
          <h2 className="text-base font-semibold text-hi mb-4 tracking-[-0.015em]">
            Supported platforms
          </h2>

          <div className="border border-line rounded-[10px] overflow-hidden mb-4">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-line bg-surface">
                  {["Platform", "Target triple", "Notes"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2 text-left text-[0.6875rem] font-semibold tracking-[0.1em] uppercase text-mute"
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

          <p className="text-[0.8125rem] text-mute leading-[1.6]">
            macOS x86-64 is not supported. Use Rosetta 2 (<code className="font-mono text-lo">arch -arm64 zsh</code>)
            or the Linux binary via Docker on Intel Macs.
          </p>
        </motion.section>

        {/* ── Manual download ───────────────────────────── */}
        <motion.section variants={up} className="mb-14">
          <h2 className="text-base font-semibold text-hi mb-3 tracking-[-0.015em]">
            Manual download
          </h2>
          <p className="text-[0.9375rem] text-[#71717a] leading-[1.7] mb-4">
            Grab an archive from GitHub Releases and place the binary anywhere on your <code className="font-mono text-[0.85em] text-lo">PATH</code>.
          </p>
          <a
            href="https://github.com/Walon-Foundation/blast/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center h-10 px-[1.125rem] bg-surface border border-rim rounded-lg text-sm font-medium text-mid no-underline transition-[border-color,color] duration-150 hover:border-mute hover:text-hi"
          >
            GitHub Releases
          </a>
        </motion.section>

        {/* ── Verify ────────────────────────────────────── */}
        <motion.section variants={up} className="mb-14">
          <h2 className="text-base font-semibold text-hi mb-4 tracking-[-0.015em]">
            Verify the install
          </h2>
          <CodeBox label="sh" cmd="blast --version" />
          <p className="text-[0.8125rem] text-mute mb-[0.875rem] leading-[1.6]">
            If the command is not found, add the install directory to your PATH.
          </p>
          <CodeBox label="sh — add to ~/.bashrc or ~/.zshrc" cmd={`export PATH="$PATH:$HOME/.local/bin"`} />
        </motion.section>

        {/* ── Uninstall ─────────────────────────────────── */}
        <motion.section variants={up}>
          <h2 className="text-base font-semibold text-hi mb-4 tracking-[-0.015em]">
            Uninstall
          </h2>
          <CodeBox label="sh" cmd="rm ~/.local/bin/blast" />
          <p className="text-[0.8125rem] text-mute leading-[1.6]">
            blast writes no config files or databases. Removing the binary is all that is needed.
          </p>
        </motion.section>

        {/* Footer link */}
        <motion.div
          variants={up}
          className="mt-16 pt-8 border-t border-line flex gap-6"
        >
          <Link
            href="/docs"
            className="text-sm text-accent no-underline transition-colors duration-150 hover:text-[#fb923c]"
          >
            Read the docs →
          </Link>
          <a
            href="https://github.com/Walon-Foundation/blast"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-lo no-underline transition-colors duration-150 hover:text-mid"
          >
            GitHub
          </a>
        </motion.div>
      </motion.div>
    </main>
  );
}
