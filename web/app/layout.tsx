import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const SITE_URL = "https://blast.walonfoundation.com";
const DESCRIPTION = "A fast, config-driven API load tester and traffic generator written in Rust.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#09090b",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "blast", template: "%s — blast" },
  description: DESCRIPTION,
  keywords: ["load testing", "API", "stress test", "rust", "blast", "traffic generator", "OpenAPI"],
  authors: [{ name: "Walon Foundation", url: "https://github.com/Walon-Foundation" }],
  creator: "Walon Foundation",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "blast",
    title: "blast",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "blast",
    description: DESCRIPTION,
  },
  alternates: { canonical: SITE_URL },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          background: "#09090b",
          color: "#fafafa",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        }}
      >
        <Navbar />
        <div style={{ flex: 1 }}>{children}</div>
        <Footer />
      </body>
    </html>
  );
}
