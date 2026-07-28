import { type CaptureResult } from "posthog-js";
import { isTransientBrowserNetworkMessage } from "@web/api/util/backend-unavailable-error.util";

/**
 * Exact unhandledrejection signature emitted by CefSharp / embedded WebView
 * automation scanners. No app frames, not actionable.
 */
const CEFSHARP_SCANNER_MESSAGE =
  "Object Not Found Matching Id:1, MethodName:update, ParamCount:4";

type ExceptionEntry = {
  type?: unknown;
  value?: unknown;
};

const readExceptionEntries = (
  properties: CaptureResult["properties"] | undefined,
): ExceptionEntry[] => {
  if (!properties) return [];

  const list = properties.$exception_list;
  if (Array.isArray(list) && list.length > 0) {
    return list as ExceptionEntry[];
  }

  const types = properties.$exception_types;
  const values = properties.$exception_values;
  if (!Array.isArray(types) && !Array.isArray(values)) {
    return [];
  }

  const length = Math.max(
    Array.isArray(types) ? types.length : 0,
    Array.isArray(values) ? values.length : 0,
  );

  return Array.from({ length }, (_, index) => ({
    type: Array.isArray(types) ? types[index] : undefined,
    value: Array.isArray(values) ? values[index] : undefined,
  }));
};

const isDroppableException = (entry: ExceptionEntry): boolean => {
  if (typeof entry.value !== "string") return false;

  if (entry.value === CEFSHARP_SCANNER_MESSAGE) return true;

  // SuperTokens/browser network blips that escape as unhandledrejections.
  // The app already treats these as expected unavailability; capturing them
  // only creates noise. SuperTokens' session fetch often rejects outside our
  // `doesSessionExist` try/catch, so client-side catch alone can't cover it.
  return (
    entry.type === "TypeError" && isTransientBrowserNetworkMessage(entry.value)
  );
};

/**
 * Drop known-unactionable `$exception` payloads in PostHog `before_send`.
 */
export function filterPosthogBeforeSend(
  event: CaptureResult | null,
): CaptureResult | null {
  if (!event || event.event !== "$exception") {
    return event;
  }

  const entries = readExceptionEntries(event.properties);
  if (entries.length === 0) {
    return event;
  }

  if (entries.every(isDroppableException)) {
    return null;
  }

  return event;
}
