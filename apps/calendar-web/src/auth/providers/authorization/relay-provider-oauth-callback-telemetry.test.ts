import { relayProviderOAuthCallbackTelemetry } from "@web/auth/providers/authorization/relay-provider-oauth-callback-telemetry";
import { afterEach, describe, expect, it, mock } from "bun:test";

describe("relayProviderOAuthCallbackTelemetry", () => {
  const realFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("requests backend callback telemetry with the relay header", () => {
    const fetchMock = mock(async () => new Response(null, { status: 204 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    relayProviderOAuthCallbackTelemetry("google", "?state=test-state&code=abc");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall).toBeDefined();
    const [url, init] = firstCall as unknown as [string, RequestInit];
    expect(url).toContain("/api/auth/google/callback?state=test-state");
    expect(init.headers).toEqual(
      expect.objectContaining({ "X-Compass-OAuth-Telemetry": "1" }),
    );
  });
});
