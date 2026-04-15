import tailwindcss from "@tailwindcss/postcss";
import { type BunPlugin } from "bun";
import postcss from "postcss";

/**
 * Bun plugin that processes CSS files through PostCSS + Tailwind 4.
 *
 * Bun's CSS bundler does not automatically run PostCSS, so Tailwind 4's
 * @theme, @source, @utility, and @import "tailwindcss" directives would be
 * treated as invalid rules without this plugin.
 */
export const postcssPlugin: BunPlugin = {
  name: "postcss",
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async ({ path }) => {
      const css = await Bun.file(path).text();
      const result = await postcss([tailwindcss()]).process(css, {
        from: path,
      });
      return { contents: result.css, loader: "css" };
    });
  },
};
