import { injectModulePreloads } from "../../inject-module-preloads";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const HTML = `<!doctype html>
<html>
  <head>
    <link rel="stylesheet" href="/index.css" />
  </head>
  <body></body>
</html>
`;

describe("injectModulePreloads", () => {
  let outdir: string;

  beforeEach(() => {
    outdir = mkdtempSync(path.join(tmpdir(), "inject-preloads-"));
  });

  afterEach(() => {
    rmSync(outdir, { recursive: true, force: true });
  });

  const write = (name: string, content: string) =>
    Bun.write(path.join(outdir, name), content);

  it("preloads the static closure plus the entry's boot dynamic import, excluding lazy chunks", async () => {
    await write(
      "index.js",
      'import{a}from"/chunk-static.js";import("/chunk-boot.js").then(({bootstrapApp:b})=>b());',
    );
    await write("chunk-static.js", 'import"/chunk-deep.js";export var a=1;');
    await write("chunk-deep.js", "export var d=1;");
    await write(
      "chunk-boot.js",
      'import{s}from"/chunk-shared.js";var v=()=>import("/chunk-lazy.js");export var bootstrapApp=()=>s(v);',
    );
    await write("chunk-shared.js", "export var s=1;");
    await write("chunk-lazy.js", "export var l=1;");
    await write("index.html", HTML);

    const critical = await injectModulePreloads(outdir);

    expect(critical).toEqual([
      "chunk-static.js",
      "chunk-boot.js",
      "chunk-deep.js",
      "chunk-shared.js",
    ]);
    const html = await Bun.file(path.join(outdir, "index.html")).text();
    expect(html).toBe(`<!doctype html>
<html>
  <head>
    <link rel="stylesheet" href="/index.css" />
    <link rel="modulepreload" href="/chunk-static.js" />
    <link rel="modulepreload" href="/chunk-boot.js" />
    <link rel="modulepreload" href="/chunk-deep.js" />
    <link rel="modulepreload" href="/chunk-shared.js" />
  </head>
  <body></body>
</html>
`);
  });

  it("ignores import-shaped text that names no emitted file", async () => {
    await write(
      "index.js",
      'import"/chunk-real.js";var msg="failed: import(\\"/chunk-ghost.js\\")";',
    );
    await write("chunk-real.js", "export var r=1;");
    await write("index.html", HTML);

    const critical = await injectModulePreloads(outdir);

    expect(critical).toEqual(["chunk-real.js"]);
  });

  it("visits shared chunks once", async () => {
    await write(
      "index.js",
      'import"/chunk-a.js";import"/chunk-b.js";import("/chunk-boot.js");',
    );
    await write("chunk-a.js", 'import{x}from"/chunk-shared.js";');
    await write("chunk-b.js", 'import{x}from"/chunk-shared.js";');
    await write("chunk-boot.js", 'import{x}from"/chunk-shared.js";');
    await write("chunk-shared.js", "export var x=1;");
    await write("index.html", HTML);

    const critical = await injectModulePreloads(outdir);

    expect(critical).toEqual([
      "chunk-a.js",
      "chunk-b.js",
      "chunk-boot.js",
      "chunk-shared.js",
    ]);
  });

  it("injects at the real end of head, not inside a comment mentioning the tag", async () => {
    await write("index.js", 'import"/chunk-a.js";');
    await write("chunk-a.js", "export var a=1;");
    await write(
      "index.html",
      `<!doctype html>
<html>
  <head>
    <!-- links are injected before </head> -->
  </head>
  <body></body>
</html>
`,
    );

    await injectModulePreloads(outdir);

    const html = await Bun.file(path.join(outdir, "index.html")).text();
    expect(html).toBe(`<!doctype html>
<html>
  <head>
    <!-- links are injected before </head> -->
    <link rel="modulepreload" href="/chunk-a.js" />
  </head>
  <body></body>
</html>
`);
  });

  it("fails loudly when the walk finds no chunks", async () => {
    await write("index.js", "console.log(1);");
    await write("index.html", HTML);

    expect(injectModulePreloads(outdir)).rejects.toThrow(
      "No boot-critical chunks found",
    );
  });

  it("fails loudly when index.html has no </head>", async () => {
    await write("index.js", 'import"/chunk-a.js";');
    await write("chunk-a.js", "export var a=1;");
    await write("index.html", "<html><body></body></html>");

    expect(injectModulePreloads(outdir)).rejects.toThrow("</head>");
  });
});
