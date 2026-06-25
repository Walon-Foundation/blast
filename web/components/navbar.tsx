"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const links = [
  { label: "Docs",      href: "/docs" },
  { label: "Changelog", href: "/changelog" },
];

export function Navbar() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return <header className="sticky top-0 z-50 h-14 border-b border-line bg-canvas/92 backdrop-blur-[16px]" />;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-canvas/92 backdrop-blur-[16px]">
      <div className="max-w-[1100px] mx-auto px-6 h-14 flex items-center justify-between">
        {/* Wordmark */}
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="font-mono font-bold text-[0.9375rem] text-hi no-underline tracking-[-0.02em]"
        >
          blast
        </Link>

        {/* Desktop nav */}
        <nav className="flex items-center gap-7">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "text-sm no-underline transition-colors duration-150 max-[700px]:hidden",
                pathname.startsWith(l.href) ? "text-hi" : "text-[#71717a] hover:text-hi"
              )}
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={() => {
              window.dispatchEvent(
                new KeyboardEvent("keydown", { key: "k", ctrlKey: true, metaKey: true, bubbles: true })
              );
            }}
            className="max-[700px]:hidden flex items-center gap-2 bg-surface border border-line rounded-md px-[0.625rem] py-[0.3rem] text-lo text-xs cursor-pointer font-mono transition-colors duration-150 hover:border-rim hover:text-mid"
            aria-label="Search"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <circle cx="6.5" cy="6.5" r="4.5" />
              <path d="M10.5 10.5L14 14" />
            </svg>
            Search
            <kbd className="text-[0.6rem] bg-canvas border border-rim rounded-[3px] px-[0.3rem] py-[0.1rem] text-mute">⌘K</kbd>
          </button>
          <a
            href="https://github.com/Walon-Foundation/blast"
            target="_blank"
            rel="noopener noreferrer"
            className="max-[700px]:hidden text-sm text-[#71717a] no-underline transition-colors duration-150 hover:text-hi"
          >
            GitHub
          </a>
          <Link
            href="/install"
            className="max-[700px]:hidden text-[0.8125rem] font-semibold text-canvas bg-[linear-gradient(120deg,var(--color-accent),var(--color-warm))] px-[0.875rem] py-[0.35rem] rounded-md no-underline tracking-[-0.01em] transition-opacity duration-150"
          >
            Download
          </Link>
        </nav>

        {/* Hamburger — mobile only */}
        <button
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
          className="hidden max-[700px]:flex bg-transparent border-0 text-[#71717a] cursor-pointer p-1"
        >
          {open ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <path d="M4 4l12 12M16 4L4 16" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <path d="M3 5h14M3 10h14M3 15h14" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-line bg-canvas px-6 pt-3 pb-5">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-[0.625rem] text-[0.9375rem] text-mid no-underline border-b border-line"
            >
              {l.label}
            </Link>
          ))}
          <a
            href="https://github.com/Walon-Foundation/blast"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="block py-[0.625rem] text-[0.9375rem] text-mid no-underline border-b border-line"
          >
            GitHub
          </a>
          <Link
            href="/install"
            onClick={() => setOpen(false)}
            className="block mt-[0.875rem] text-center px-[0.625rem] py-[0.625rem] text-[0.9375rem] font-semibold text-canvas bg-[linear-gradient(120deg,var(--color-accent),var(--color-warm))] rounded-lg no-underline"
          >
            Download
          </Link>
        </div>
      )}
    </header>
  );
}
