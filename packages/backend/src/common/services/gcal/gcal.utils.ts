import { GaxiosError } from "gaxios";

// occurs when token expired or revoked
export const isInvalidGoogleToken = (e: unknown) => {
  if (!isGoogleError(e)) return false;

  const err = e as GaxiosError;
  // Handle code as both string "400" and number 400
  const code = err.code;
  const is400 =
    code === "400" ||
    Number(code) === 400 ||
    err.response?.status === 400 ||
    (err as unknown as { status?: number }).status === 400;
  const hasInvalidMsg = err.message === "invalid_grant";
  const responseData = err.response?.data as
    | Record<string, unknown>
    | undefined;
  const hasInvalidData = responseData?.["error"] === "invalid_grant";

  return is400 && (hasInvalidMsg || hasInvalidData);
};

export const isGoogleError = (e: unknown) => {
  if (e instanceof GaxiosError) return true;

  const errObj = e as Record<string, unknown> | null | undefined;
  if (errObj?.["name"] === "GaxiosError") return true;

  // Also detect GaxiosError-like objects by structure, as errors from
  // google-auth-library may not pass instanceof checks due to module versions
  const hasGaxiosShape =
    typeof errObj === "object" &&
    errObj !== null &&
    "config" in errObj &&
    "response" in errObj &&
    typeof errObj["response"] === "object" &&
    errObj["response"] !== null &&
    "data" in (errObj["response"] as Record<string, unknown>);

  return hasGaxiosShape;
};

export const isInvalidValue = (e: GaxiosError) => {
  return e.message === "Invalid Value";
};
