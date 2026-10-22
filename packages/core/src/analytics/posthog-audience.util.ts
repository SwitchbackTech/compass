const INTERNAL_EMAIL_DOMAINS = new Set(["keepsoftwaresimple.com"]);

const NON_HUMAN_UA_PATTERN =
  /(?:bot|crawler|spider|headless|yandex(?:bot|images|direct|media|video|search)?|playwright|puppeteer|slimerjs|phantomjs|selenium|webdriver|curl\/|wget\/|python-requests|go-http-client|java\/|libwww|httpclient|okhttp|postmanruntime|insomnia|claude(?:bot|search|web)?|anthropic-ai|gptbot|chatgpt-user|ccbot|bytespider|petalbot|amazonbot|bingbot|duckduckbot|googlebot|applebot|facebookexternalhit|linkedinbot|slackbot|discordbot|telegrambot|whatsapp|twitterbot|semrush|ahrefsbot|mj12bot|dotbot|rogerbot|screaming frog|lighthouse|pagespeed|chrome-lighthouse|prerender|phantom|nightmare|electron\/)/i;

/**
 * Team and fixture inboxes that should not pollute product funnels. PostHog
 * cohorts filter on `$internal_or_test_user`; this helper flags them at
 * identify time rather than dropping their events silently.
 */
export function isInternalOrTestEmail(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  const domain = email
    .slice(at + 1)
    .trim()
    .toLowerCase();
  return INTERNAL_EMAIL_DOMAINS.has(domain);
}

/** Local and loopback hosts share the same PostHog flag as internal users. */
export function isInternalOrTestHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host.endsWith(".local")
  );
}

/**
 * Crawlers, automation harnesses, and headless browsers that are not real
 * visitors. Their events are dropped in PostHog `before_send`.
 */
export function isNonHumanUserAgent(userAgent: string | undefined): boolean {
  if (userAgent === undefined) return true;
  const ua = userAgent.trim();
  if (ua.length === 0) return true;
  return NON_HUMAN_UA_PATTERN.test(ua);
}
