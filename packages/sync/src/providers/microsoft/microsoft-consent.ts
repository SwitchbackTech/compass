// Microsoft Entra consent and interaction errors. Tenants that require admin
// approval surface these instead of a usable authorization code.
const ADMIN_CONSENT_ERROR_CODE = "AADSTS65001";

export function isMicrosoftConsentRequired(
  error?: string | null,
  description?: string | null,
): boolean {
  const normalizedError = error?.trim().toLowerCase();
  if (
    normalizedError === "consent_required" ||
    normalizedError === "interaction_required"
  ) {
    return true;
  }
  if (!description) return false;
  return description.includes(ADMIN_CONSENT_ERROR_CODE);
}
