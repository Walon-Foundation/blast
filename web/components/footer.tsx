import Link from "next/link";

export function Footer() {
  return (
    <footer
      suppressHydrationWarning
      className="border-t border-line mt-24"
    >
      <div
        className="max-w-[1100px] mx-auto px-6 py-7 flex items-center justify-between flex-wrap gap-4"
      >
        <span
          className="font-mono text-[0.8125rem] text-mute tracking-[-0.02em]"
        >
          blast — MIT License
        </span>

        <nav
          className="flex gap-6 flex-wrap"
        >
          {[
            { label: "Docs",       href: "/docs",       external: false },
            { label: "Changelog",  href: "/changelog",  external: false },
            { label: "Install",    href: "/install",    external: false },
            { label: "GitHub",   href: "https://github.com/Walon-Foundation/blast", external: true },
            { label: "Releases", href: "https://github.com/Walon-Foundation/blast/releases", external: true },
          ].map((l) =>
            l.external ? (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[0.8125rem] text-mute no-underline transition-colors duration-150 hover:text-[#71717a]"
              >
                {l.label}
              </a>
            ) : (
              <Link
                key={l.label}
                href={l.href}
                className="text-[0.8125rem] text-mute no-underline transition-colors duration-150 hover:text-[#71717a]"
              >
                {l.label}
              </Link>
            )
          )}
        </nav>
      </div>
    </footer>
  );
}
