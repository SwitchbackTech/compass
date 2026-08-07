// Provider SDK errors (gaxios, google-auth-library) retain the full request
// config as ENUMERABLE own properties — Authorization bearer, client_secret,
// refresh_token. Spreading or JSON.stringify-ing such an error leaks those
// secrets into logs. describeErrorChain therefore reads an explicit allowlist
// per level (name, message, and reason when it is a string) and never copies
// arbitrary own properties, however the error was constructed upstream.

export interface DescribedError {
  name: string;
  message: string;
  reason?: string;
}

const DEFAULT_MAX_DEPTH = 5;

export function describeErrorChain(
  value: unknown,
  maxDepth: number = DEFAULT_MAX_DEPTH,
): DescribedError[] {
  const chain: DescribedError[] = [];
  const seen = new WeakSet<object>();
  let current: unknown = value;

  while (current instanceof Error && chain.length < maxDepth) {
    if (seen.has(current)) break;
    seen.add(current);

    const reason = (current as { reason?: unknown }).reason;
    chain.push({
      name: current.name,
      message: current.message,
      ...(typeof reason === "string" ? { reason } : {}),
    });

    current = current.cause;
  }

  return chain;
}

// Innermost cause last, in an OTel log-attribute-safe scalar. Attributes only
// accept scalars, so this is the shape that reaches otel.transport.ts.
export function formatErrorChain(chain: DescribedError[]): string {
  return chain
    .map((entry) =>
      entry.reason
        ? `${entry.name}(${entry.reason}): ${entry.message}`
        : `${entry.name}: ${entry.message}`,
    )
    .join(" <- ");
}

// The deepest message in the chain — the highest-value single field for
// alerting, since it is usually the provider's own rejection reason.
export function rootCauseMessage(chain: DescribedError[]): string | undefined {
  return chain.at(-1)?.message;
}

// Exact matches: the actual structural field names gaxios/google-auth-library
// hang secrets off (error.config, error.response, error.config.headers).
// Matched exactly, not by substring, because "request"/"response"/"headers"
// are common substrings of entirely benign field names (requestId,
// responseTimeMs, headerCount) that must not be censored.
const UNSAFE_EXACT_KEYS = new Set(["config", "request", "response", "headers"]);

// Substring matches: credential-shaped words. Matched after stripping
// non-alphanumeric characters, so both camelCase (refreshToken) and snake_case
// (refresh_token) forms are caught by one entry.
const UNSAFE_KEY_SUBSTRINGS = [
  "token",
  "secret",
  "password",
  "credential",
  "authorization",
  "cookie",
  "apikey",
];

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Case- and separator-insensitive denylist for meta keys a transport is about
// to log. Guards against the same gaxios leak vector for keys that reach a
// transport via any path other than an Error's .cause chain (e.g. a raw error
// object logged as meta directly).
export function isUnsafeMetaKey(key: string): boolean {
  const normalized = normalizeKey(key);
  if (UNSAFE_EXACT_KEYS.has(normalized)) return true;
  return UNSAFE_KEY_SUBSTRINGS.some((substring) =>
    normalized.includes(substring),
  );
}
