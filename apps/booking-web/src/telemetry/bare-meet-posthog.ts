import { type PostHog } from "posthog-js";

export function isBareMeetPathname(pathname: string): boolean {
  return /^\/meet\/?$/.test(pathname);
}

/** Entry-bundle telemetry for bare `/meet` (avoids lazy chunk PostHog duplicates). */
export function wireBareMeetLandingTelemetry(
  client: PostHog | undefined,
): void {
  if (typeof window === "undefined" || !client) return;
  if (!isBareMeetPathname(window.location.pathname)) return;

  client.capture("booking_landing_viewed");

  document.addEventListener(
    "click",
    (event) => {
      if (!isBareMeetPathname(window.location.pathname)) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href*='meetingSetup=1']");
      if (!anchor) return;
      client.capture("booking_setup_cta_clicked", { source: "landing" });
    },
    { capture: true },
  );
}
