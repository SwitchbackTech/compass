import { renderMeetLandingHtml } from "./render-meet-landing-html";
import {
  MEET_LANDING_CANONICAL_URL,
  MEET_LANDING_HEADLINE,
  MEET_LANDING_HTML_TITLE,
  MEET_LANDING_META_DESCRIPTION,
} from "./src/landing/meet-landing.copy";

const MEET_LANDING_OG_TITLE =
  "Simple booking page for your calendar | Compass Calendar";

import { describe, expect, it } from "bun:test";
import path from "node:path";

describe("renderMeetLandingHtml", () => {
  it("injects landing SEO tags and crawlable copy", async () => {
    const baseIndexHtml = await Bun.file(
      path.resolve(import.meta.dir, "src/index.html"),
    ).text();
    const html = renderMeetLandingHtml(baseIndexHtml);

    expect(html).toContain(`<title>${MEET_LANDING_HTML_TITLE}</title>`);
    expect(html).toContain(MEET_LANDING_META_DESCRIPTION);
    expect(html).toContain(`href="${MEET_LANDING_CANONICAL_URL}"`);
    expect(html).toContain(MEET_LANDING_HEADLINE);
    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain("<noscript>");
  });

  it("replaces generic shell SEO tags instead of stripping the landing ones", async () => {
    const baseIndexHtml = await Bun.file(
      path.resolve(import.meta.dir, "src/index.html"),
    ).text();
    const html = renderMeetLandingHtml(baseIndexHtml);

    expect(html).toContain(
      `<meta property="og:title" content="${MEET_LANDING_OG_TITLE}" />`,
    );
    expect(html).not.toContain(
      'content="Meeting pages by Compass Calendar" />',
    );
    expect(html.match(/property="og:image"/g)).toHaveLength(1);
    expect(html.match(/name="description"/g)).toHaveLength(1);
    expect(html).toContain(
      `<meta name="description" content="${MEET_LANDING_META_DESCRIPTION}" />`,
    );
  });
});
