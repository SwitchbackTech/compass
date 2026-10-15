import {
  buildDesktopConnectRelayUrl,
  buildDesktopOAuthRelayUrl,
  DESKTOP_OAUTH_STATE_PREFIX,
  hasDesktopOAuthStateMarker,
  parseDesktopAuthDeepLink,
  parseDesktopConnectDeepLink,
  parseDesktopDayDeepLink,
  parseDesktopEventDeepLink,
} from "@core/desktop/desktop-oauth-state.util";
import { describe, expect, it } from "bun:test";

describe("desktop oauth state", () => {
  // buildSignInOAuthState owns which states carry the marker, and its own
  // test covers that; this is the marker reader on its own.
  it("recognizes the desktop marker", () => {
    expect(
      hasDesktopOAuthStateMarker(`${DESKTOP_OAUTH_STATE_PREFIX}v1.payload`),
    ).toBe(true);
  });

  it("leaves browser state unmarked", () => {
    expect(hasDesktopOAuthStateMarker("v1.payload")).toBe(false);
  });
});

describe("desktop connect deep links", () => {
  it("builds connect relay urls", () => {
    expect(
      buildDesktopConnectRelayUrl(
        "google",
        "?provider=google&status=connected",
      ),
    ).toBe(
      "compass://connect/google/callback?provider=google&status=connected",
    );
  });

  it("parses the same connect deep-link shape the relay builds", () => {
    const url = buildDesktopConnectRelayUrl(
      "google",
      "?provider=google&status=connected",
    );
    expect(parseDesktopConnectDeepLink(url)).toEqual({
      provider: "google",
      query: "?provider=google&status=connected",
    });
    expect(parseDesktopConnectDeepLink("compass://connect/zoom/callback")).toBe(
      null,
    );
  });
});

describe("desktop auth deep links", () => {
  it("builds compass auth callback deep links", () => {
    expect(
      buildDesktopOAuthRelayUrl(
        "google",
        "?code=abc&state=compass-desktop%3Aid",
      ),
    ).toBe(
      "compass://auth/google/callback?code=abc&state=compass-desktop%3Aid",
    );
  });

  it("parses the same deep-link shape the relay builds", () => {
    const url = buildDesktopOAuthRelayUrl(
      "microsoft",
      "?code=abc&state=compass-desktop%3Aid",
    );
    expect(parseDesktopAuthDeepLink(url)).toEqual({
      provider: "microsoft",
      query: "?code=abc&state=compass-desktop%3Aid",
    });
    expect(
      parseDesktopAuthDeepLink(buildDesktopOAuthRelayUrl("apple", "")),
    ).toEqual({
      provider: "apple",
      query: "",
    });
  });

  it("ignores non-auth compass links", () => {
    expect(parseDesktopAuthDeepLink("compass://agenda")).toBeNull();
  });

  it("rejects a callback link for an unknown provider", () => {
    expect(parseDesktopAuthDeepLink("compass://auth/zoom/callback")).toBeNull();
  });
});

describe("desktop day deep links", () => {
  it("parses a calendar day link", () => {
    expect(parseDesktopDayDeepLink("compass://day/2026-10-15")).toBe(
      "2026-10-15",
    );
  });

  it("rejects invalid calendar dates", () => {
    expect(parseDesktopDayDeepLink("compass://day/2026-13-01")).toBeNull();
    expect(parseDesktopDayDeepLink("compass://day/not-a-date")).toBeNull();
  });

  it("returns null for other compass links", () => {
    expect(
      parseDesktopDayDeepLink("compass://auth/google/callback"),
    ).toBeNull();
  });
});

describe("desktop event deep links", () => {
  it("keeps the whole event id, including its first character", () => {
    expect(parseDesktopEventDeepLink("compass://event/abc-123")).toBe(
      "abc-123",
    );
  });

  it("returns null without an event id", () => {
    expect(parseDesktopEventDeepLink("compass://event/")).toBeNull();
    expect(parseDesktopEventDeepLink("compass://event/   ")).toBeNull();
  });

  it("returns null for other compass links", () => {
    expect(
      parseDesktopEventDeepLink("compass://auth/google/callback?code=abc"),
    ).toBeNull();
  });
});
