import path from "node:path";

// Only the metafile fields used here. build.ts passes Bun.build's metafile
// (metafile: true), which lists every output's imports with their kind, so no
// parsing of the emitted sources is needed.
interface Metafile {
  outputs: Record<
    string,
    {
      imports: Array<{ path: string; kind: string }>;
      inputs?: Record<string, unknown>;
      entryPoint?: string;
    }
  >;
}

// Dynamic imports made from deeper chunks are normally the lazy route views
// and excluded from preloading, but some of them always execute on boot. Each
// source file listed here gets its containing chunk (plus that chunk's static
// closure) preloaded as well. RootShell is the root route's component - kept
// a lazy import only so route-shape tests can mock its auth stack (see
// router.routes.tsx) - and renders on every page load, 404s included.
// Metafile input keys are relative to the build's cwd, so entries here are
// matched by path suffix.
export const ALWAYS_BOOT_SOURCES = ["src/components/RootShell/RootShell.tsx"];

/**
 * Injects `<link rel="modulepreload">` tags for every boot-critical chunk into
 * the built index.html, so the browser fetches the whole boot graph in
 * parallel instead of discovering it one import level (= one round-trip) at a
 * time: index.js -> its static chunks -> app.bootstrap -> ~25 more chunks.
 *
 * Boot-critical means the static-import closure of the entry plus the
 * static-import closure of the entry's own dynamic imports. index.js's lone
 * dynamic import (app.bootstrap) always executes on boot, so it counts; a
 * second dynamic import added to index.tsx would get preloaded on the same
 * assumption. Dynamic imports in deeper chunks are the lazy route views and
 * are deliberately NOT followed - except the chunks holding
 * ALWAYS_BOOT_SOURCES, which are lazy imports that still run on every boot.
 */
export async function injectModulePreloads(
  outdir: string,
  metafile: string | object | undefined,
  alwaysBootSources: string[] = ALWAYS_BOOT_SOURCES,
): Promise<string[]> {
  if (!metafile) {
    throw new Error(
      "Bun.build returned no metafile; build.ts must pass metafile: true",
    );
  }
  const meta = (
    typeof metafile === "string" ? JSON.parse(metafile) : metafile
  ) as Metafile;

  const entry = Object.keys(meta.outputs).find(
    (key) => meta.outputs[key].entryPoint,
  );
  if (!entry) {
    throw new Error("No entrypoint output found in the build metafile");
  }

  const roots = [entry];
  for (const source of alwaysBootSources) {
    const chunk = Object.keys(meta.outputs).find((key) =>
      Object.keys(meta.outputs[key].inputs ?? {}).some(
        (input) => input === source || input.endsWith(`/${source}`),
      ),
    );
    if (!chunk) {
      throw new Error(
        `Always-boot source ${source} is in no build output; update ALWAYS_BOOT_SOURCES in inject-module-preloads.ts`,
      );
    }
    if (!roots.includes(chunk)) roots.push(chunk);
  }

  const critical = roots.filter((key) => key !== entry);
  const seen = new Set(roots);
  const queue = [...roots];
  while (queue.length > 0) {
    const key = queue.shift() as string;
    for (const imp of meta.outputs[key].imports) {
      const bootCritical =
        imp.kind === "import-statement" ||
        (key === entry && imp.kind === "dynamic-import");
      if (!bootCritical) continue;
      if (!imp.path.endsWith(".js") || seen.has(imp.path)) continue;
      if (!(imp.path in meta.outputs)) continue;
      seen.add(imp.path);
      critical.push(imp.path);
      queue.push(imp.path);
    }
  }

  if (critical.length === 0) {
    // With splitting enabled the entry always imports chunks; an empty walk
    // means the metafile shape changed or the wrong output was picked.
    throw new Error(`No boot-critical chunks found walking ${entry}`);
  }

  // Metafile paths are outdir-relative ("./chunk-x.js"); the page serves them
  // from the root (publicPath "/").
  const names = critical.map((key) => key.replace(/^\.\//, ""));

  const htmlPath = path.join(outdir, "index.html");
  const html = await Bun.file(htmlPath).text();
  const links = `${names
    .map((name) => `  <link rel="modulepreload" href="/${name}" />`)
    .join("\n")}\n`;
  let sawHead = false;
  const rewritten = new HTMLRewriter()
    .on("head", {
      element(el) {
        sawHead = true;
        el.append(links, { html: true });
      },
    })
    .transform(html);
  if (!sawHead) {
    throw new Error(`${htmlPath} has no <head> to inject preloads into`);
  }
  await Bun.write(htmlPath, rewritten);

  return names;
}
