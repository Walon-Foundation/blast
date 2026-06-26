import type { Metadata } from "next";
import { CopyButton } from "@/components/copy-button";
import { CodeBlock } from "@/components/docs/code-block";
import { ActiveSidebar } from "@/components/docs/sidebar";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "blast documentation. Learn how to use blast run, blast stress, blast mock, and configure your API tests with blast.config.json.",
  alternates: {
    canonical: "https://blast.walonfoundation.com/docs",
  },
  openGraph: {
    title: "blast Docs",
    description:
      "Full reference for blast commands and blast.config.json configuration.",
    url: "https://blast.walonfoundation.com/docs",
  },
};

/* ── Code block ────────────────────────────────────── */

function Pre({ lang = "bash", children }: { lang?: string; children: string }) {
  return (
    <div className="pre-outer relative mb-6 rounded-lg border border-line overflow-hidden">
      <CopyButton text={children.trim()} />
      <CodeBlock code={children} lang={lang} />
    </div>
  );
}

/* ── Inline code ───────────────────────────────────── */

function C({ children }: { children: string }) {
  return (
    <code className="font-mono text-[0.82em] bg-raised border border-rim text-[#c4b5fd] px-[0.38em] py-[0.12em] rounded">
      {children}
    </code>
  );
}

/* ── Table ─────────────────────────────────────────── */

function Table({ cols, rows }: { cols: string[]; rows: string[][] }) {
  return (
    <div className="mb-7 overflow-x-auto border border-line rounded-lg">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-surface">
            {cols.map((c) => (
              <th
                key={c}
                className="px-[0.875rem] py-2 text-left text-[0.6875rem] font-semibold tracking-[0.1em] uppercase text-lo"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className={ri < rows.length - 1 ? "border-b border-surface" : ""}
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={[
                    "px-[0.875rem] py-[0.625rem] align-top leading-[1.6]",
                    ci === 0
                      ? "text-ok font-mono text-[0.8125rem]"
                      : "text-[#71717a]",
                  ].join(" ")}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Section wrapper ───────────────────────────────── */

function Section({ id, title, children, first = false }: {
  id: string;
  title: string;
  children: React.ReactNode;
  first?: boolean;
}) {
  return (
    <section
      id={id}
      className={["mb-14 scroll-mt-[88px]", first ? "pt-0" : "pt-2"].join(" ")}
    >
      <h2
        className={[
          "text-hi leading-[1.2]",
          first
            ? "text-3xl font-bold tracking-[-0.03em] mb-[0.875rem] pb-[0.875rem] border-b border-line"
            : "text-lg font-semibold tracking-[-0.015em] mb-3",
        ].join(" ")}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function SubSection({ id, title, mono = false, children }: {
  id: string;
  title: string;
  mono?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="mb-10 scroll-mt-[88px]">
      <h3
        className={[
          "text-[0.9375rem] font-semibold mb-[0.625rem] tracking-[-0.01em]",
          mono ? "text-[#fb923c] font-mono" : "text-hi",
        ].join(" ")}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.9375rem] text-mid leading-[1.75] mb-[0.875rem]">
      {children}
    </p>
  );
}

/* ── Page ──────────────────────────────────────────── */

export default function DocsPage() {
  return (
    <div className="max-w-[1100px] mx-auto px-6 flex gap-16 items-start">
      {/* ── Sidebar ──────────────────────────────────── */}
      <aside className="w-44 shrink-0 pt-12 pb-12 max-[900px]:hidden">
        <div className="sticky top-[4.5rem]">
          <ActiveSidebar />
        </div>
      </aside>

      {/* ── Content ──────────────────────────────────── */}
      <article className="flex-1 min-w-0 pt-12 pb-24">

        {/* Mobile pill nav — hidden on desktop, shown ≤900px */}
        <nav className="hidden max-[900px]:block mb-8 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-2 pb-1">
            {[
              { label: "Overview",    href: "#overview" },
              { label: "Install",     href: "#install" },
              { label: "Quick start", href: "#quickstart" },
              { label: "init",        href: "#cmd-init" },
              { label: "validate",    href: "#cmd-validate" },
              { label: "check",       href: "#cmd-check" },
              { label: "seed",        href: "#cmd-seed" },
              { label: "run",         href: "#cmd-run" },
              { label: "stress",      href: "#cmd-stress" },
              { label: "mock",        href: "#cmd-mock" },
              { label: "Config",      href: "#configuration" },
              { label: "Fields",      href: "#extensions" },
              { label: "Fake data",   href: "#fake-data" },
              { label: "Tags",        href: "#tags" },
              { label: "Setup",       href: "#setup" },
              { label: "Chaining",    href: "#chaining" },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="shrink-0 px-3 py-[0.3rem] text-xs text-[#71717a] bg-surface border border-line rounded-full no-underline whitespace-nowrap transition-colors duration-150 hover:text-hi"
              >
                {l.label}
              </a>
            ))}
          </div>
        </nav>

        {/* Overview */}
        <Section id="overview" title="blast docs" first>
          <P>
            <strong className="text-hi">blast</strong> is a config-driven API load tester and mock server
            written in Rust. Define your endpoints in <C>blast.config.json</C>, then hit every one
            with a single command — no code, no scripting.
          </P>
          <P>
            It supports fake data generation via <C>{"{{fake.*}}"}</C> placeholders, request chaining
            using JSON extraction and dot-path rules, fixed-RPS load tests, and stress ramp tests that
            auto-detect where your API breaks.
          </P>
        </Section>

        {/* Install */}
        <Section id="install" title="Installation">
          <SubSection id="install-unix" title="Linux & macOS">
            <Pre lang="bash">{`curl -fsSL https://raw.githubusercontent.com/Walon-Foundation/blast/main/install.sh | sh`}</Pre>
            <P>
              Detects your OS and architecture. Downloads the pre-built binary to <C>~/.local/bin</C>.
              See the <a href="/install" className="text-[#fb923c] underline underline-offset-[3px]">install guide</a> for custom install paths.
            </P>
          </SubSection>

          <SubSection id="install-windows" title="Windows (PowerShell)">
            <Pre lang="powershell">{`irm https://raw.githubusercontent.com/Walon-Foundation/blast/main/install.ps1 | iex`}</Pre>
            <P>Installs the <C>x86_64-pc-windows-msvc</C> binary and adds it to your user PATH.</P>
          </SubSection>

          <SubSection id="install-source" title="Build from source">
            <Pre lang="bash">{`cargo install --git https://github.com/Walon-Foundation/blast`}</Pre>
            <P>Requires Rust 1.75 or later. Cross-compile targets are listed in the repository.</P>
          </SubSection>
        </Section>

        {/* Quick start */}
        <Section id="quickstart" title="Quick start">
          <Pre lang="bash">{`# 1. Create a starter config in the current directory
blast init

# 2. Verify the config is valid and show all endpoints
blast validate

# 3. Hit every endpoint once to confirm they respond
blast check

# 4. Seed test data (runs endpoints tagged "seed")
blast seed --count 50 --concurrency 10

# 5. Fixed-rate load test (endpoints tagged "run")
blast run --rps 50 --duration 60

# 6. Stress ramp — finds the breaking point
blast stress --min-rps 10 --max-rps 200 --step 20 --step-duration 30`}</Pre>
        </Section>

        {/* Commands */}
        <Section id="commands" title="Commands">

          <SubSection id="cmd-init" title="blast init [path]" mono>
            <P>
              Creates <C>blast.config.json</C> in the given directory (default: current directory). The
              generated file includes example endpoints with fake data placeholders. Edit it to describe
              your API, then run <C>blast check</C>.
            </P>
            <Pre lang="bash">{`blast init
blast init ./my-api`}</Pre>
          </SubSection>

          <SubSection id="cmd-validate" title="blast validate" mono>
            <P>
              Loads and validates the config. Prints the base URL, total endpoint count, and a table of
              all endpoints with their method, path, and tags. Exits non-zero on any validation error —
              useful as a CI gate to catch broken configs early.
            </P>
          </SubSection>

          <SubSection id="cmd-check" title="blast check" mono>
            <P>
              Hits every endpoint once in order. Merges global headers with per-endpoint headers.
              Extracts values from successful responses so later endpoints can use them. Prints a
              coloured pass/fail table with per-request timing. Exits non-zero on any failure.
            </P>
          </SubSection>

          <SubSection id="cmd-seed" title="blast seed" mono>
            <P>
              Runs all endpoints tagged <C>"seed"</C> N times with configurable concurrency. Each iteration
              is fully independent with its own extraction context. Use this to pre-populate a test
              database before a load test.
            </P>
            <Table
              cols={["Flag", "Default", "Description"]}
              rows={[
                ["--count", "10", "Total number of iterations"],
                ["-j, --concurrency", "1", "Maximum parallel requests"],
              ]}
            />
            <Pre lang="bash">{`blast seed --count 1000 --concurrency 20`}</Pre>
          </SubSection>

          <SubSection id="cmd-run" title="blast run" mono>
            <P>
              Fixed-RPS load test. Uses a tokio interval ticker to maintain the target request rate.
              Round-robins over endpoints tagged <C>"run"</C>. Prints live per-second progress. Prints
              a final summary with p50, p95, p99, and p999 latency percentiles.
            </P>
            <Table
              cols={["Flag", "Default", "Description"]}
              rows={[
                ["--rps", "10", "Target requests per second"],
                ["-d, --duration", "30", "Test duration in seconds"],
              ]}
            />
            <Pre lang="bash">{`blast run --rps 100 --duration 120`}</Pre>
          </SubSection>

          <SubSection id="cmd-stress" title="blast stress" mono>
            <P>
              RPS ramp test. Steps from <C>--min-rps</C> to <C>--max-rps</C> in increments of{" "}
              <C>--step</C>. Stops early when p99 exceeds 500ms or the error rate exceeds 1%.
              Prints a per-step coloured result table and a final recommendation showing the last
              stable RPS.
            </P>
            <Table
              cols={["Flag", "Default", "Description"]}
              rows={[
                ["--min-rps", "10", "Starting RPS"],
                ["--max-rps", "100", "Maximum RPS to reach"],
                ["--step", "10", "RPS increase per step"],
                ["--step-duration", "15", "Seconds to hold each step"],
              ]}
            />
            <Pre lang="bash">{`blast stress --min-rps 10 --max-rps 500 --step 50 --step-duration 20`}</Pre>
          </SubSection>

          <SubSection id="cmd-mock" title="blast mock" mono>
            <P>
              Starts a local HTTP server from your <C>blast.config.json</C>. Every endpoint becomes a
              live route. Frontend developers can point their app at{" "}
              <C>http://localhost:&lt;port&gt;</C> and build against realistic responses without waiting
              for the real backend.
            </P>
            <P>
              Response bodies are read from the <C>mock_response</C> field on each endpoint.{" "}
              <C>{"{{fake.*}}"}</C> placeholders are resolved on every request, so each response gets
              fresh data. If no <C>mock_response</C> is defined, the route returns{" "}
              <C>{"{"}"status": "ok"{"}"}</C> with the declared status code.
            </P>
            <Table
              cols={["Flag", "Default", "Description"]}
              rows={[
                ["--port", "4000", "Port to listen on"],
                ["--config", "blast.config.json", "Path to config (auto-detected if omitted)"],
              ]}
            />
            <Pre lang="bash">{`blast mock
blast mock --port 8080
blast mock --config ./api/blast.config.json`}</Pre>
            <Pre lang="bash">{`$ blast mock --port 4000

  Loaded blast.config.json

  GET    /api/v1/users               200
  POST   /api/v1/auth/register       201
  POST   /api/v1/auth/login          200
  GET    /api/v1/users/{id}          200
  DELETE /api/v1/users/{id}          204

  5 routes mounted
  Listening on http://localhost:4000`}</Pre>
          </SubSection>

        </Section>

        {/* Configuration */}
        <Section id="configuration" title="Configuration">
          <P>
            blast reads <C>blast.config.json</C> from the current directory (or the path passed
            to <C>--config</C>). The file has a flat structure — a base URL, global headers, an
            optional setup array, and an endpoints array.
          </P>

          <Pre lang="json">{`{
  "base_url": "http://localhost:3000",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer {{token}}"
  },
  "setup": [
    {
      "name": "login",
      "method": "POST",
      "path": "/api/v1/auth/login",
      "body": { "email": "admin@example.com", "password": "Admin1234!" },
      "expect_status": 200,
      "extract": { "token": "data.access_token" }
    }
  ],
  "endpoints": [
    {
      "name": "register user",
      "method": "POST",
      "path": "/api/v1/auth/register",
      "body": {
        "email": "{{fake.email}}",
        "password": "{{fake.password}}",
        "name": "{{fake.name}}"
      },
      "expect_status": 201,
      "tags": ["seed"]
    },
    {
      "name": "list users",
      "method": "GET",
      "path": "/api/v1/users",
      "expect_status": 200,
      "weight": 3,
      "tags": ["run"]
    },
    {
      "name": "get user",
      "method": "GET",
      "path": "/api/v1/users/{{user_id}}",
      "expect_status": 200,
      "tags": ["run"]
    }
  ]
}`}</Pre>
        </Section>

        {/* Endpoint fields */}
        <Section id="extensions" title="Endpoint fields">
          <Table
            cols={["Field", "Type", "Description"]}
            rows={[
              ["name", "string", "Human-readable label shown in output"],
              ["method", "string", "HTTP method — GET, POST, PUT, PATCH, DELETE"],
              ["path", "string", "URL path, appended to base_url. Supports {{placeholders}}."],
              ["headers", "object", "Per-endpoint headers, merged with global headers"],
              ["body", "object", "Request body (JSON). Supports {{fake.*}} placeholders."],
              ["expect_status", "integer", "Expected HTTP status code; counted as failure if response differs"],
              ["extract", "object", "Map of variable name → dot-path to extract from response JSON"],
              ["weight", "integer", "Relative traffic weight for load distribution (default: 1)"],
              ["tags", "array", 'Commands that pick up this endpoint: "seed", "run", "stress"'],
              ["mock_response", "object", "Body returned by blast mock for this route"],
            ]}
          />
        </Section>

        {/* Fake data */}
        <Section id="fake-data" title="Fake data">
          <P>
            Use <C>{"{{fake.*}}"}</C> placeholders in request body examples or header values.
            A new value is generated per request — every iteration of <C>blast seed</C> and
            every request in <C>blast run</C> gets fresh data.
          </P>

          <Table
            cols={["Placeholder", "Generates"]}
            rows={[
              ["{{fake.email}}", "Random email address (e.g. john.doe@example.com)"],
              ["{{fake.username}}", "Random username"],
              ["{{fake.password}}", "8–16 character password with mixed chars"],
              ["{{fake.name}}", "Full name"],
              ["{{fake.firstname}}", "First name only"],
              ["{{fake.lastname}}", "Last name only"],
              ["{{fake.word}}", "Single lorem word"],
              ["{{fake.sentence}}", "Lorem sentence (3–8 words)"],
              ["{{fake.paragraph}}", "Lorem paragraph (1–3 sentences)"],
              ["{{fake.company}}", "Company name"],
              ["{{fake.city}}", "City name"],
              ["{{fake.country}}", "Country name"],
              ["{{fake.uuid}}", "UUID v4"],
              ["{{env.VAR_NAME}}", "Value of environment variable VAR_NAME"],
            ]}
          />

          <P>
            Unknown placeholders produce a warning and are left unchanged in the output so
            they are easy to spot.
          </P>
        </Section>

        {/* Tags */}
        <Section id="tags" title="Tags">
          <P>
            The <C>tags</C> array on an endpoint controls which blast command picks it up.
            An endpoint can appear in multiple commands by listing multiple tags.
          </P>

          <Table
            cols={["Tag", "Command", "Notes"]}
            rows={[
              ['"seed"', "blast seed", "Runs N times; each iteration independent"],
              ['"run"', "blast run", "Round-robined for the test duration"],
              ['"stress"', "blast stress", "Round-robined per step"],
            ]}
          />

          <P>
            If no endpoints have any tags, all commands fall back to using every endpoint.
            Endpoints in the <C>setup</C> array are always excluded from tag matching — they
            run once before load regardless of tags.
          </P>
        </Section>

        {/* Setup */}
        <Section id="setup" title="Setup phase">
          <P>
            The top-level <C>setup</C> array in <C>blast.config.json</C> lists endpoints that
            run once in order before any load traffic. Extracted values from setup steps are
            shared with every subsequent request for the entire test.
          </P>
          <P>
            If a setup step fails (wrong status code, network error), blast aborts immediately
            rather than firing load with a broken context. This prevents sending thousands of
            requests with a missing auth token.
          </P>
          <P>
            The canonical use case is authentication: add a login endpoint to <C>setup</C>,
            extract the access token with <C>extract</C>, then include it in every load endpoint
            via the global <C>headers</C> using <C>{"{{token}}"}</C>.
          </P>
        </Section>

        {/* Chaining */}
        <Section id="chaining" title="Request chaining">
          <P>
            The <C>extract</C> field on any endpoint stores response values in a shared context
            map keyed by variable name. Later endpoints reference them with <C>{"{{name}}"}</C>{" "}
            in any string field — headers, body values, or URL path parameters.
          </P>
          <P>
            The dot-path walker descends into nested JSON objects (<C>data.user.id</C>) and
            array indices (<C>items.0.id</C>). Only scalar values (strings, numbers, booleans)
            are stored — objects and arrays emit a warning and are skipped.
          </P>
          <Pre lang="json">{`{
  "name": "login",
  "method": "POST",
  "path": "/api/v1/auth/login",
  "body": { "email": "admin@example.com", "password": "Admin1234!" },
  "expect_status": 200,
  "extract": {
    "token":   "data.access_token",
    "user_id": "data.user.id"
  }
}`}</Pre>
          <Pre lang="json">{`{
  "name": "get user",
  "method": "GET",
  "path": "/api/v1/users/{{user_id}}",
  "headers": { "Authorization": "Bearer {{token}}" },
  "expect_status": 200,
  "tags": ["run"]
}`}</Pre>
          <P>
            Values extracted during setup are available to all subsequent endpoints.
            Values extracted during load operations are available to later endpoints in the
            same request round.
          </P>
        </Section>

        {/* Edit on GitHub */}
        <div className="mt-12 pt-6 border-t border-line">
          <a
            href="https://github.com/Walon-Foundation/blast/blob/main/web/app/docs/page.tsx"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.8125rem] text-mute no-underline transition-colors duration-150 hover:text-[#71717a]"
          >
            Edit this page on GitHub →
          </a>
        </div>

      </article>
    </div>
  );
}
