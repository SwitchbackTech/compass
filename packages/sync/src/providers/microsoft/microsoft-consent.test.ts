import { isMicrosoftConsentRequired } from "@sync/providers/microsoft/microsoft-consent";

describe("Microsoft OAuth callback consent errors", () => {
  it.each([
    ["consent_required", undefined],
    ["interaction_required", undefined],
    [
      "invalid_grant",
      "AADSTS65001: The user or administrator has not consented to use the application",
    ],
  ] as const)("detects admin consent for %s", (error, description) => {
    expect(isMicrosoftConsentRequired(error, description)).toBe(true);
  });

  it("does not treat a user cancellation as admin consent", () => {
    expect(isMicrosoftConsentRequired("access_denied")).toBe(false);
  });
});
