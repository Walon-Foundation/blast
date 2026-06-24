import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Search } from "@/components/search";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const SITE_URL = "https://blast.walonfoundation.com";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f97316",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "blast — API load testing and mock server",
    template: "%s — blast",
  },
  description:
    "blast is a fast, config-driven API load tester and mock server written in Rust. One OpenAPI spec drives load tests, stress tests, and a local mock server.",
  keywords: [
    "load testing",
    "API load test",
    "mock server",
    "OpenAPI mock",
    "stress test",
    "rust cli",
    "blast",
    "traffic generator",
    "API testing",
    "frontend mock api",
  ],
  authors: [{ name: "Walon Foundation", url: "https://github.com/Walon-Foundation" }],
  creator: "Walon Foundation",
  publisher: "Walon Foundation",
  category: "developer tools",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "blast",
    title: "blast — API load testing and mock server",
    description:
      "One OpenAPI spec. Two tools. blast run fires load tests. blast mock spins up a local API server for frontend development.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "blast — API load testing and mock server",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "blast — API load testing and mock server",
    description:
      "One OpenAPI spec. blast run fires load tests. blast mock starts a local API for frontend devs.",
    images: ["/opengraph-image"],
  },
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body
        suppressHydrationWarning
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "blast",
              applicationCategory: "DeveloperApplication",
              operatingSystem: "Linux, macOS, Windows",
              description:
                "A fast, config-driven API load tester and mock server written in Rust. One OpenAPI spec drives load tests, stress tests, and a local mock server.",
              url: "https://blast.walonfoundation.com",
              downloadUrl: "https://blast.walonfoundation.com/install",
              softwareVersion: "0.1.1",
              license: "https://opensource.org/licenses/MIT",
              author: {
                "@type": "Organization",
                name: "Walon Foundation",
                url: "https://github.com/Walon-Foundation",
              },
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
            }),
          }}
        />
        <Navbar />
        <Search />
        <div style={{ flex: 1 }}>{children}</div>
        <Footer />
      </body>
    </html>
  );
}
