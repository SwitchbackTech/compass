import { DESKTOP_OAUTH_STATE_PREFIX } from "@core/desktop/desktop-oauth-state.util";

const SIGNIN_OAUTH_STATE_VERSION_PREFIX = "v1.";

const LEGACY_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ParsedSignInOAuthState = {
  rawState: string;
  nonce: string;
  posthogDistinctId?: string;
  isDesktop: boolean;
};

type SignInOAuthStatePayload = {
  n: string;
  ph?: string;
};

function base64UrlEncode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(encoded: string): string {
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "===".slice((normalized.length + 3) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodePayload(payload: SignInOAuthStatePayload): string {
  return `${SIGNIN_OAUTH_STATE_VERSION_PREFIX}${base64UrlEncode(JSON.stringify(payload))}`;
}

function decodePayload(body: string): SignInOAuthStatePayload | null {
  if (!body.startsWith(SIGNIN_OAUTH_STATE_VERSION_PREFIX)) {
    return null;
  }
  try {
    const json = base64UrlDecode(
      body.slice(SIGNIN_OAUTH_STATE_VERSION_PREFIX.length),
    );
    const parsed = JSON.parse(json) as SignInOAuthStatePayload;
    if (typeof parsed.n !== "string" || parsed.n.length === 0) {
      return null;
    }
    if (parsed.ph !== undefined && typeof parsed.ph !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Builds OAuth `state` for provider sign-in, optionally carrying PostHog anon id. */
export function buildSignInOAuthState(input: {
  isDesktopClient: boolean;
  posthogDistinctId?: string;
}): string {
  const payload: SignInOAuthStatePayload = {
    n: crypto.randomUUID(),
    ...(input.posthogDistinctId ? { ph: input.posthogDistinctId } : {}),
  };
  const body = encodePayload(payload);
  return input.isDesktopClient ? `${DESKTOP_OAUTH_STATE_PREFIX}${body}` : body;
}

export function parseSignInOAuthState(
  state: string,
): ParsedSignInOAuthState | null {
  let body = state;
  let isDesktop = false;
  if (body.startsWith(DESKTOP_OAUTH_STATE_PREFIX)) {
    isDesktop = true;
    body = body.slice(DESKTOP_OAUTH_STATE_PREFIX.length);
  }

  if (LEGACY_UUID_PATTERN.test(body)) {
    return {
      rawState: state,
      nonce: body,
      isDesktop,
    };
  }

  const payload = decodePayload(body);
  if (!payload) {
    return null;
  }

  const posthogDistinctId =
    payload.ph && payload.ph.length > 0 ? payload.ph : undefined;

  return {
    rawState: state,
    nonce: payload.n,
    posthogDistinctId,
    isDesktop,
  };
}

function posthogDistinctIdFromAppleOAuthState(
  state: string,
): string | undefined {
  try {
    const decoded = base64UrlDecode(state);
    const parsed = JSON.parse(decoded) as { ph?: unknown };
    return typeof parsed.ph === "string" && parsed.ph.length > 0
      ? parsed.ph
      : undefined;
  } catch {
    try {
      const decoded = atob(state);
      const parsed = JSON.parse(decoded) as { ph?: unknown };
      return typeof parsed.ph === "string" && parsed.ph.length > 0
        ? parsed.ph
        : undefined;
    } catch {
      return undefined;
    }
  }
}

export function posthogDistinctIdFromSignInOAuthState(
  state: string | null | undefined,
): string | undefined {
  if (!state) return undefined;
  return (
    parseSignInOAuthState(state)?.posthogDistinctId ??
    posthogDistinctIdFromAppleOAuthState(state)
  );
}
