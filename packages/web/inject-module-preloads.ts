import path from "node:path";

// Only the metafile fields used here. build.ts passes Bun.build's metafile
// (metafile: true), which lists every output's imports with their kind, so no
// parsing of the emitted sources is needed.
interface Metafile {
  outputs: Record<
    string,
    {
      imports: Array<{ path: string; kind: string }>;
      entryPoint?: string;
    }
  >;
}

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
 * are deliberately NOT followed.
 */
export async function injectModulePreloads(
  outdir: string,
  metafile: string | object | undefined,
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

  const critical: string[] = [];
  const seen = new Set([entry]);
  const queue = [entry];
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
