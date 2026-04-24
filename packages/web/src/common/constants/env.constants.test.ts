import { isGoogleAuthConfigured } from "./env.constants";
import { describe, expect, it } from "bun:test";

describe("isGoogleAuthConfigured", () => {
  it("rejects missing and placeholder Google client IDs", () => {
    expect(isGoogleAuthConfigured()).toBe(false);
    expect(isGoogleAuthConfigured("")).toBe(false);
    expect(isGoogleAuthConfigured("undefined")).toBe(false);
    expect(
      isGoogleAuthConfigured(
        "compass-self-host-placeholder.apps.googleusercontent.com",
      ),
    ).toBe(false);
  });

  it("accepts a custom Google client ID", () => {
    expect(
      isGoogleAuthConfigured("1234567890-example.apps.googleusercontent.com"),
    ).toBe(true);
  });
});
