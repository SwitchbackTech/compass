import { escapeHtml } from "@core/util/escape-html.util";
import { meetingSetupRootHref } from "@web/booking/meeting-setup.search";
import {
  MEET_LANDING_CANONICAL_URL,
  MEET_LANDING_CTA_LABEL,
  MEET_LANDING_HEADLINE,
  MEET_LANDING_HTML_TITLE,
  MEET_LANDING_META_DESCRIPTION,
  MEET_LANDING_SUPPORTING,
} from "./src/landing/meet-landing.copy";
import path from "node:path";

const MEET_LANDING_OG_IMAGE_URL =
  "https://www.compasscalendar.com/og-image.png";

const MEET_LANDING_OG_TITLE =
  "Simple booking page for your calendar | Compass Calendar";

/** Base shell tags the landing page replaces with its own SEO values. */
const SUPERSEDED_BASE_META_TAGS = [
  /<meta\s+name="description"[\s\S]*?\/>/,
  /<meta\s+property="og:title"[\s\S]*?\/>/,
  /<meta\s+property="og:description"[\s\S]*?\/>/,
  /<meta\s+property="og:image"[\s\S]*?\/>/,
  /<meta\s+property="og:image:width"[\s\S]*?\/>/,
  /<meta\s+property="og:image:height"[\s\S]*?\/>/,
  /<meta\s+name="twitter:title"[\s\S]*?\/>/,
  /<meta\s+name="twitter:description"[\s\S]*?\/>/,
  /<meta\s+name="twitter:image"[\s\S]*?\/>/,
];

/** Static HTML shell for bare `/meet`: SEO tags plus crawlable copy before React boots. */
export function renderMeetLandingHtml(baseIndexHtml: string): string {
  const jsonLd = JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Compass Calendar meeting pages",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: MEET_LANDING_CANONICAL_URL,
      description: MEET_LANDING_META_DESCRIPTION,
    },
    null,
    2,
  );

  const headExtras = `
    <title>${MEET_LANDING_HTML_TITLE}</title>
    <meta name="description" content="${escapeHtml(MEET_LANDING_META_DESCRIPTION)}" />
    <link rel="canonical" href="${MEET_LANDING_CANONICAL_URL}" />
    <meta property="og:url" content="${MEET_LANDING_CANONICAL_URL}" />
    <meta property="og:title" content="${escapeHtml(MEET_LANDING_OG_TITLE)}" />
    <meta property="og:description" content="${escapeHtml(MEET_LANDING_META_DESCRIPTION)}" />
    <meta property="og:image" content="${MEET_LANDING_OG_IMAGE_URL}" />
    <meta name="twitter:title" content="${escapeHtml(MEET_LANDING_OG_TITLE)}" />
    <meta name="twitter:description" content="${escapeHtml(MEET_LANDING_META_DESCRIPTION)}" />
    <meta name="twitter:image" content="${MEET_LANDING_OG_IMAGE_URL}" />
    <script type="application/ld+json">${jsonLd}</script>`;

  const shellWithoutGenericSeo = SUPERSEDED_BASE_META_TAGS.reduce(
    (html, tag) => html.replace(tag, ""),
    baseIndexHtml,
  );
  const html = shellWithoutGenericSeo.replace(
    /<title>[\s\S]*?<\/title>/,
    headExtras,
  );

  const noscript = `
    <noscript>
      <main>
        <h1>${escapeHtml(MEET_LANDING_HEADLINE)}</h1>
        <p>${escapeHtml(MEET_LANDING_SUPPORTING)}</p>
        <p><a href="${meetingSetupRootHref()}">${escapeHtml(MEET_LANDING_CTA_LABEL)}</a></p>
      </main>
    </noscript>`;

  return html.replace(
    '<div id="root"></div>',
    `${noscript}\n    <div id="root"></div>`,
  );
}

export async function writeMeetLandingHtml(outdir: string): Promise<void> {
  const basePath = path.resolve(import.meta.dir, "src/index.html");
  const baseIndexHtml = await Bun.file(basePath).text();
  await Bun.write(
    path.join(outdir, "meet-landing.html"),
    renderMeetLandingHtml(baseIndexHtml),
  );
}
