import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 — Page not found",
};

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center min-h-[60vh]">
      <p className="font-mono text-[clamp(5rem,15vw,9rem)] font-extrabold tracking-[-0.06em] leading-none text-line mb-6 select-none">
        404
      </p>

      <h1 className="text-xl font-semibold text-hi tracking-[-0.03em] mb-3">
        Page not found
      </h1>

      <p className="text-[0.9375rem] text-lo leading-[1.6] max-w-[360px] mb-8">
        That route doesn&apos;t exist. Maybe the URL is wrong or the page was moved.
      </p>

      <div className="flex gap-3 flex-wrap justify-center">
        <Link
          href="/"
          className="text-sm font-semibold text-canvas bg-[linear-gradient(120deg,#f97316,#fbbf24)] px-5 py-2 rounded-[7px] no-underline"
        >
          Home
        </Link>
        <Link
          href="/docs"
          className="text-sm text-[#71717a] bg-surface border border-line px-5 py-2 rounded-[7px] no-underline"
        >
          Docs
        </Link>
      </div>
    </main>
  );
}
