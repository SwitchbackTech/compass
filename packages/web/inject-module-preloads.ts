import path from "node:path";

// Bun.build exposes no per-output import metadata (BuildArtifact is just
// path/kind/hash/...), so the import graph is recovered from the emitted files
// themselves. Bun's minifier writes every specifier double-quoted, but the
// patterns tolerate single quotes and whitespace so a non-minified build
// parses the same way.
const STATIC_IMPORT_RE =
  /\bimport\s*["']([^"']+)["']|\bfrom\s*["']([^"']+)["']/g;
const DYNAMIC_IMPORT_RE = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;

function parseImports(source: string) {
  const staticSpecs: string[] = [];
  const dynamicSpecs: string[] = [];
  for (const match of source.matchAll(STATIC_IMPORT_RE)) {
    staticSpecs.push((match[1] ?? match[2]) as string);
  }
  for (const match of source.matchAll(DYNAMIC_IMPORT_RE)) {
    dynamicSpecs.push(match[1] as string);
  }
  return { staticSpecs, dynamicSpecs };
}

/**
 * Injects `<link rel="modulepreload">` tags for every boot-critical chunk into
 * the built index.html, so the browser fetches the whole boot graph in
 * parallel instead of discovering it one import level (= one round-trip) at a
 * time: index.js -> its static chunks -> app.bootstrap -> ~25 more chunks.
 *
 * Boot-critical means the static-import closure of index.js plus the
 * static-import closure of index.js's own dynamic imports. index.js's lone
 * dynamic import (app.bootstrap) always executes on boot, so it counts; a
 * second dynamic import added to index.tsx would get preloaded on the same
 * assumption. Dynamic imports in deeper chunks are the lazy route views and
 * are deliberately NOT followed.
 */
export async function injectModulePreloads(outdir: string): Promise<string[]> {
  const entry = "index.js";
  const critical: string[] = [];
  const seen = new Set([entry]);
  const queue = [entry];

  while (queue.length > 0) {
    const chunk = queue.shift() as string;
    const source = await Bun.file(path.join(outdir, chunk)).text();
    const { staticSpecs, dynamicSpecs } = parseImports(source);
    const followed =
      chunk === entry ? [...staticSpecs, ...dynamicSpecs] : staticSpecs;

    for (const spec of followed) {
      // Specifiers are root-relative URLs (publicPath "/"). Skip anything that
      // isn't an emitted .js sibling: the regexes can in principle match
      // import-shaped text inside a string literal.
      const name = spec.replace(/^\.?\//, "");
      if (!name.endsWith(".js") || seen.has(name)) continue;
      if (!(await Bun.file(path.join(outdir, name)).exists())) continue;
      seen.add(name);
      critical.push(name);
      queue.push(name);
    }
  }

  if (critical.length === 0) {
    // With splitting enabled index.js always imports chunks; an empty walk
    // means the specifier parsing regressed (e.g. Bun changed emit syntax).
    throw new Error(`No boot-critical chunks found walking ${entry}`);
  }

  const htmlPath = path.join(outdir, "index.html");
  const html = await Bun.file(htmlPath).text();
  // Anchor on the LAST closing head tag: an HTML comment earlier in <head>
  // can contain the literal tag text, and injecting there would leave the
  // links commented out and inert.
  const anchor = html.lastIndexOf("</head>");
  if (anchor === -1) {
    throw new Error(`${htmlPath} has no </head> to inject preloads into`);
  }
  const links = critical
    .map((name) => `    <link rel="modulepreload" href="/${name}" />`)
    .join("\n");
  const indentStart =
    anchor - (/[ \t]*$/.exec(html.slice(0, anchor))?.[0].length ?? 0);
  await Bun.write(
    htmlPath,
    `${html.slice(0, indentStart)}${links}\n  ${html.slice(anchor)}`,
  );

  return critical;
}
