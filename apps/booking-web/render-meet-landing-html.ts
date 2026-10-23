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
    <meta name="description" content="${escapeHtmlAttr(MEET_LANDING_META_DESCRIPTION)}" />
    <link rel="canonical" href="${MEET_LANDING_CANONICAL_URL}" />
    <meta property="og:url" content="${MEET_LANDING_CANONICAL_URL}" />
    <meta property="og:title" content="${escapeHtmlAttr(MEET_LANDING_OG_TITLE)}" />
    <meta property="og:description" content="${escapeHtmlAttr(MEET_LANDING_META_DESCRIPTION)}" />
    <meta property="og:image" content="${MEET_LANDING_OG_IMAGE_URL}" />
    <meta name="twitter:title" content="${escapeHtmlAttr(MEET_LANDING_OG_TITLE)}" />
    <meta name="twitter:description" content="${escapeHtmlAttr(MEET_LANDING_META_DESCRIPTION)}" />
    <meta name="twitter:image" content="${MEET_LANDING_OG_IMAGE_URL}" />
    <script type="application/ld+json">${jsonLd}</script>`;

  let html = baseIndexHtml.replace(/<title>[\s\S]*?<\/title>/, headExtras);

  html = html.replace(/<meta\s+name="description"[\s\S]*?\/>/, "");
  html = html.replace(/<meta\s+property="og:title"[\s\S]*?\/>/, "");
  html = html.replace(/<meta\s+property="og:description"[\s\S]*?\/>/, "");
  html = html.replace(/<meta\s+name="twitter:title"[\s\S]*?\/>/, "");
  html = html.replace(/<meta\s+name="twitter:description"[\s\S]*?\/>/, "");

  const noscript = `
    <noscript>
      <main>
        <h1>${escapeHtmlText(MEET_LANDING_HEADLINE)}</h1>
        <p>${escapeHtmlText(MEET_LANDING_SUPPORTING)}</p>
        <p><a href="${meetingSetupRootHref()}">${escapeHtmlText(MEET_LANDING_CTA_LABEL)}</a></p>
      </main>
    </noscript>`;

  return html.replace(
    '<div id="root"></div>',
    `${noscript}\n    <div id="root"></div>`,
  );
}

function escapeHtmlAttr(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
}

function escapeHtmlText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export async function writeMeetLandingHtml(outdir: string): Promise<void> {
  const basePath = path.resolve(import.meta.dir, "src/index.html");
  const baseIndexHtml = await Bun.file(basePath).text();
  await Bun.write(
    path.join(outdir, "meet-landing.html"),
    renderMeetLandingHtml(baseIndexHtml),
  );
}
