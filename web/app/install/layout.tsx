import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Install",
  description:
    "Install blast on Linux, macOS, or Windows. One-line curl installer, PowerShell script, or build from source with Cargo.",
  alternates: {
    canonical: "https://blast.walonfoundation.com/install",
  },
  openGraph: {
    title: "Install blast",
    description:
      "Install blast on Linux, macOS, or Windows. One-line installer or build from source.",
    url: "https://blast.walonfoundation.com/install",
  },
};

export default function InstallLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
