"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

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
      className={cn(
        "copy-btn absolute top-[10px] right-[10px] p-1 bg-transparent border border-rim rounded-[5px] cursor-pointer opacity-0 transition-[opacity,color] duration-150 leading-none",
        copied ? "text-ok" : "text-lo"
      )}
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
