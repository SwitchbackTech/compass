import { type CaptureResult } from "posthog-js";

/**
 * Exact unhandledrejection signature emitted by CefSharp / embedded WebView
 * automation scanners. No app frames, not actionable.
 */
const CEFSHARP_SCANNER_MESSAGE =
  "Object Not Found Matching Id:1, MethodName:update, ParamCount:4";

/**
 * Browser / SuperTokens network blips that escape as unhandledrejections.
 * The app already treats these as expected unavailability
 * (`isBackendUnavailableError`); capturing them as exceptions only creates
 * noise. SuperTokens' internal session fetch often rejects outside our
 * `doesSessionExist` try/catch, so client-side catch alone can't cover it.
 */
const TRANSIENT_NETWORK_MESSAGES = new Set([
  "Failed to fetch",
  "NetworkError when attempting to fetch resource.",
]);

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

const isTransientNetworkTypeError = (entry: ExceptionEntry): boolean => {
  return (
    entry.type === "TypeError" &&
    typeof entry.value === "string" &&
    TRANSIENT_NETWORK_MESSAGES.has(entry.value)
  );
};

const isCefSharpScannerNoise = (entry: ExceptionEntry): boolean => {
  return (
    typeof entry.value === "string" && entry.value === CEFSHARP_SCANNER_MESSAGE
  );
};

/**
 * Returns true when a PostHog capture payload is a known-unactionable
 * `$exception` that should be dropped in `before_send`.
 */
export function shouldDropPosthogException(
  event: CaptureResult | null,
): boolean {
  if (!event || event.event !== "$exception") {
    return false;
  }

  const entries = readExceptionEntries(event.properties);
  if (entries.length === 0) {
    return false;
  }

  return entries.every(
    (entry) =>
      isTransientNetworkTypeError(entry) || isCefSharpScannerNoise(entry),
  );
}

export function filterPosthogBeforeSend(
  event: CaptureResult | null,
): CaptureResult | null {
  if (shouldDropPosthogException(event)) {
    return null;
  }
  return event;
}
