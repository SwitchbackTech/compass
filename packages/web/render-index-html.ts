import path from "node:path";

interface BuildOutput {
  kind: string;
  path: string;
}

// Bun.build's HTML-entrypoint mode (entrypoints: ["src/index.html"]) rewrites
// <script>/<link> tags to the real output paths for us, but its splitting
// output can point <script src> at the wrong chunk (one that doesn't contain
// index.tsx's own top-level code), leaving #root permanently empty with no
// error. Building from the JS entrypoint (src/index.tsx) instead guarantees
// exactly one `entry-point` output, so we inject its real path ourselves.
export async function renderIndexHtml(outdir: string, outputs: BuildOutput[]) {
  const entry = outputs.find((output) => output.kind === "entry-point");
  if (!entry) {
    throw new Error("Bun.build produced no entry-point output for index.tsx");
  }
  const cssOutputs = outputs.filter((output) => output.path.endsWith(".css"));

  let html = await Bun.file(
    path.resolve(import.meta.dir, "src/index.html"),
  ).text();

  html = html.replace(
    '<script type="module" src="./index.tsx"></script>',
    `<script type="module" src="/${path.basename(entry.path)}"></script>`,
  );

  const cssLinks = cssOutputs
    .map(
      (output) =>
        `    <link rel="stylesheet" href="/${path.basename(output.path)}" />`,
    )
    .join("\n");
  if (cssLinks) {
    html = html.replace("</head>", `${cssLinks}\n  </head>`);
  }

  await Bun.write(path.join(outdir, "index.html"), html);
}
