import {
  clearGoogleAuthorizationIntent,
  readGoogleAuthorizationIntent,
  writeGoogleAuthorizationIntent,
} from "./google-authorization.storage";
import { afterEach, describe, expect, it } from "bun:test";

describe("google-authorization.storage", () => {
  afterEach(() => sessionStorage.clear());

  it("stores and reads an intent by OAuth state", () => {
    writeGoogleAuthorizationIntent("state-1", {
      intent: "signIn",
      returnPath: "/week?panel=tasks#top",
      createdAt: Date.now(),
    });

    expect(readGoogleAuthorizationIntent("state-1")).toMatchObject({
      intent: "signIn",
      returnPath: "/week?panel=tasks#top",
    });
  });

  it("removes invalid or expired stored intents", () => {
    writeGoogleAuthorizationIntent("state-1", {
      intent: "signIn",
      returnPath: "/week",
      createdAt: Date.now() - 11 * 60 * 1000,
    });

    expect(readGoogleAuthorizationIntent("state-1")).toBeNull();
  });

  it("removes stored intents with invalid JSON", () => {
    sessionStorage.setItem("compass.googleAuthorizationIntent.state-1", "{");

    expect(readGoogleAuthorizationIntent("state-1")).toBeNull();
  });

  it("removes stored intents with unsafe return paths", () => {
    sessionStorage.setItem(
      "compass.googleAuthorizationIntent.state-1",
      JSON.stringify({
        intent: "signIn",
        returnPath: "//evil.example",
        createdAt: Date.now(),
      }),
    );

    expect(readGoogleAuthorizationIntent("state-1")).toBeNull();
  });

  it("clears a consumed intent", () => {
    writeGoogleAuthorizationIntent("state-1", {
      intent: "connectCalendar",
      returnPath: "/day",
      createdAt: Date.now(),
    });

    clearGoogleAuthorizationIntent("state-1");

    expect(readGoogleAuthorizationIntent("state-1")).toBeNull();
  });
});
