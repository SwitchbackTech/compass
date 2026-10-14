import { getPosthogClient } from "@web/auth/posthog/posthog.bootstrap";

/** Best-effort anon distinct id for tying server-side OAuth events to the browser. */
export function readPosthogDistinctIdForOAuth(): string | undefined {
  try {
    const distinctId = getPosthogClient()?.get_distinct_id?.();
    return typeof distinctId === "string" && distinctId.length > 0
      ? distinctId
      : undefined;
  } catch {
    return undefined;
  }
}
