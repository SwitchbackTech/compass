import { googleFailureCause } from "@sync/providers/google/google-error";

export const MAX_JOB_LAST_ERROR_LENGTH = 500;

// Operator-facing job error text: response status/reason only, truncated,
// never request-derived secrets (googleapis attaches the bearer on `config`).
export function sanitizeJobLastError(error: unknown): string | null {
  const cause = googleFailureCause(error);
  const raw = (
    cause?.message ?? (error instanceof Error ? error.message : String(error))
  ).trim();
  if (!raw || raw === "undefined") return null;
  return raw.slice(0, MAX_JOB_LAST_ERROR_LENGTH);
}
