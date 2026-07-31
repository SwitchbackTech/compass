import path from "node:path";

// Copied unhashed (not via Bun's HTML asset pipeline) so meta tags like
// og:image, and index.html's favicon link, can reference a stable URL
// across builds.
export async function copyStaticAssets(outdir: string) {
  await Bun.write(
    path.join(outdir, "og-image.png"),
    Bun.file(path.resolve(import.meta.dir, "src/assets/png/og-image.png")),
  );
  await Bun.write(
    path.join(outdir, "favicon.ico"),
    Bun.file(path.resolve(import.meta.dir, "src/favicon.ico")),
  );
}
