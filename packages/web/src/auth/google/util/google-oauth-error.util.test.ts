import { isGooglePopupClosedError } from "@web/auth/google/util/google-oauth-error.util";

describe("isGooglePopupClosedError", () => {
  it("returns true for non-oauth popup_closed type", () => {
    expect(isGooglePopupClosedError({ type: "popup_closed" })).toBe(true);
  });

  it("returns true for popup-closed error messages", () => {
    expect(
      isGooglePopupClosedError({ message: "Popup window closed by user" }),
    ).toBe(true);
  });

  it("returns false for non-popup auth failures", () => {
    expect(isGooglePopupClosedError({ error: "access_denied" })).toBe(false);
    expect(isGooglePopupClosedError(new Error("network down"))).toBe(false);
  });
});
