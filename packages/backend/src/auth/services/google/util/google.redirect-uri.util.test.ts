import { AuthError } from "@backend/common/errors/auth/auth.errors";
import {
  assertGoogleRedirectUri,
  getGoogleAuthCallbackUrl,
} from "./google.redirect-uri.util";

describe("google.redirect-uri.util", () => {
  it("derives the callback URL from FRONTEND_URL origin", () => {
    expect(getGoogleAuthCallbackUrl("https://cal.example.com/day")).toBe(
      "https://cal.example.com/auth/google/callback",
    );
  });

  it("accepts the configured callback URL", () => {
    expect(() =>
      assertGoogleRedirectUri(
        "https://cal.example.com/auth/google/callback",
        "https://cal.example.com",
      ),
    ).not.toThrow();
  });

  it("rejects unexpected redirect URLs", () => {
    expect(() =>
      assertGoogleRedirectUri(
        "https://evil.example/auth/google/callback",
        "https://cal.example.com",
      ),
    ).toThrow(AuthError.GoogleRedirectUriMismatch.description);
  });
});
