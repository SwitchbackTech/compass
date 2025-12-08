import { join } from "node:path";
import postcss from "postcss";
import tailwindcssPlugin from "@tailwindcss/postcss";

export const TAILWIND_CSS_TEST_STYLE_TESTID = "tailwindcss-test-styles";

// Custom PostCSS plugin to remove comments
const removeCommentRules: postcss.TransformCallback = (root) => {
  root.walkComments((comment) => {
    comment.remove();
  });
};

// Custom PostCSS plugin to remove `@layer` rules but keep the CSS inside
const removeLayerRules: postcss.TransformCallback = (root) => {
  root.walkAtRules("layer", (rule) => {
    rule.replaceWith(rule.nodes);
  });
};

// Custom PostCSS plugin to remove `@property` rules
const removePropertyRules: postcss.TransformCallback = (root) => {
  root.walkAtRules("property", (rule) => {
    rule.remove();
  });
};

const extractor = postcss([
  tailwindcssPlugin({ optimize: { minify: false } }),
  removeCommentRules,
  removeLayerRules,
  removePropertyRules,
]);

const webSrcDirectory = join(__dirname, "../../../src");

let cachedCss: string | null = null;

export async function getTailwindCss(): Promise<string> {
  if (cachedCss) return cachedCss;

  const result = await extractor.process(
    `
    @layer theme, base, components, utilities;
    @import "tailwindcss/theme.css" layer(theme);
    @import "tailwindcss/preflight.css" layer(base);
    @import "tailwindcss/utilities.css" layer(utilities);
  `,
    { from: webSrcDirectory },
  );

  cachedCss = result.css;

  return result.css;
}

export function appendTailwindCss(htmlDoc: HTMLDocument, css: string) {
  const style = htmlDoc.createElement("style");

  style.innerHTML = css;

  style.setAttribute("data-testid", TAILWIND_CSS_TEST_STYLE_TESTID);
  htmlDoc.body.appendChild(style); // append to body - the react root is here
}
