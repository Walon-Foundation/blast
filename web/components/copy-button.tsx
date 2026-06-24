"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <button
      onClick={copy}
      aria-label="Copy code"
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        padding: "0.25rem",
        background: "none",
        border: "1px solid #27272a",
        borderRadius: 5,
        cursor: "pointer",
        color: copied ? "#86efac" : "#52525b",
        opacity: 0,
        transition: "opacity 0.15s, color 0.15s",
        lineHeight: 0,
      }}
      className="copy-btn"
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 7l3.5 3.5L12 3" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="8" height="8" rx="1.5" />
          <path d="M2 10V2h8" />
        </svg>
      )}
    </button>
  );
}
