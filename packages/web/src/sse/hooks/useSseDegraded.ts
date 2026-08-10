import { useSyncExternalStore } from "react";
import {
  isSseDegraded,
  subscribeSseDegraded,
} from "@web/sse/client/sse.client";

/**
 * Whether the live SSE stream has been down long enough that displayed data
 * can no longer be trusted as fresh. Surfaces sse.client's previously
 * analytics-only degraded signal to the UI, so a dead stream on an open tab
 * doesn't keep claiming "Calendar connected" / "Updated N minutes ago".
 */
export function useSseDegraded(): boolean {
  return useSyncExternalStore(subscribeSseDegraded, isSseDegraded);
}
