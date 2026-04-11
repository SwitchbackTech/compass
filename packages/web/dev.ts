import { watch } from "fs";
import path from "path";
import { postcssPlugin } from "./plugins/postcss.plugin";

const PORT = Number(process.env.WEB_PORT) || 9080;
const OUTDIR = path.resolve(import.meta.dir, "../../build/web");
const SRCDIR = path.resolve(import.meta.dir, "src");

// In development: unminified + inline sourcemaps + live-reload watcher.
// In test/other: minified + no sourcemaps + no live-reload (keeps bundle small
// so Playwright tests can parse it quickly on CI's limited CPU).
const IS_DEV = (process.env.NODE_ENV ?? "development") === "development";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === "undefined") {
  console.error(`
    Oopsies, you're missing the GOOGLE_CLIENT_ID variable.
    Make sure you include all required environment variables in the .env file.
    Reference: https://docs.compasscalendar.com/docs/get-started/setup
  `);
  process.exit(1);
}

// Define process.env as a whole object so both dot and bracket notation work:
// process.env.NODE_ENV and process.env["NODE_ENV"] are both replaced correctly.
const define: Record<string, string> = {
  "process.env": JSON.stringify({
    NODE_ENV: process.env.NODE_ENV || "development",
    API_BASEURL: process.env.BASEURL ?? "",
    GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID,
    POSTHOG_KEY: process.env.POSTHOG_KEY || "undefined",
    POSTHOG_HOST: process.env.POSTHOG_HOST || "undefined",
    PORT: String(PORT),
  }),
  BUILD_VERSION: JSON.stringify("dev"),
};

// SSE clients waiting for reload signals (dev mode only)
const reloadClients = new Set<ReadableStreamDefaultController<Uint8Array>>();

function notifyReload() {
  const msg = new TextEncoder().encode("data: reload\n\n");
  for (const ctrl of reloadClients) {
    try {
      ctrl.enqueue(msg);
    } catch {
      reloadClients.delete(ctrl);
    }
  }
}

async function build() {
  const result = await Bun.build({
    entrypoints: [path.resolve(import.meta.dir, "src/index.html")],
    outdir: OUTDIR,
    target: "browser",
    // Dev: inline sourcemaps for easy debugging; non-dev (e.g. test): strip them
    // entirely so the bundle stays ~3.5 MB instead of ~25 MB. CI Playwright
    // tests run a fresh Chromium per test; shaving 20+ seconds off V8 parse
    // time is the difference between passing and hitting the 30 s timeout.
    sourcemap: IS_DEV ? "inline" : "none",
    minify: !IS_DEV,
    splitting: false,
    define,
    plugins: [postcssPlugin],
  });

  if (!result.success) {
    console.error("[build] failed:");
    for (const message of result.logs) console.error(message);
    return false;
  }
  return true;
}

// Initial build before serving
console.log("[compass] building...");
await build();
console.log(`[compass] dev server → http://localhost:${PORT}`);

if (IS_DEV) {
  // Watch src/ and rebuild on changes (debounced) — dev mode only
  let rebuildTimer: ReturnType<typeof setTimeout> | null = null;
  watch(SRCDIR, { recursive: true }, (_event, filename) => {
    if (!filename || filename.includes(".test.")) return;
    if (rebuildTimer) clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(async () => {
      console.log(`[rebuild] ${filename}`);
      const ok = await build();
      if (ok) notifyReload();
    }, 80);
  });
}

// Live reload script injected into HTML responses (dev mode only)
const LIVE_RELOAD_SCRIPT = IS_DEV
  ? `<script>
  new EventSource('/__live-reload').onmessage = () => location.reload();
</script>`
  : "";

Bun.serve({
  port: PORT,
  // Prevent Bun from closing long-lived SSE connections prematurely.
  // Default is 10 s which produces "[Bun.serve]: request timed out" noise in CI.
  idleTimeout: IS_DEV ? 255 : 0,
  async fetch(req) {
    const url = new URL(req.url);
    const { pathname } = url;

    // SSE endpoint for live reload (dev mode only)
    if (IS_DEV && pathname === "/__live-reload") {
      let ctrl!: ReadableStreamDefaultController<Uint8Array>;
      const stream = new ReadableStream<Uint8Array>({
        start(c) {
          ctrl = c;
          reloadClients.add(ctrl);
        },
        cancel() {
          reloadClients.delete(ctrl);
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Try to serve a file from the build output
    const filePath = path.join(
      OUTDIR,
      pathname === "/" ? "index.html" : pathname,
    );
    const file = Bun.file(filePath);

    if (await file.exists()) {
      if (filePath.endsWith(".html")) {
        const html = (await file.text()).replace(
          "</body>",
          `${LIVE_RELOAD_SCRIPT}</body>`,
        );
        return new Response(html, {
          headers: { "Content-Type": "text/html" },
        });
      }
      return new Response(file);
    }

    // SPA fallback — return index.html for client-side routes
    const index = Bun.file(path.join(OUTDIR, "index.html"));
    const html = (await index.text()).replace(
      "</body>",
      `${LIVE_RELOAD_SCRIPT}</body>`,
    );
    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  },
});
