/**
 * Accept both common array encodings used by HTTP clients:
 * `calendarIds=a,b` and `calendarIds=a&calendarIds=b`.
 *
 * Empty entries are retained so the owning Zod contract rejects malformed
 * input rather than silently changing its meaning.
 */
export function parseCommaSeparatedQueryParam(
  value: unknown,
): string[] | undefined {
  if (typeof value === "string") return value.split(",");
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value.flatMap((item) => item.split(","));
  }
  return undefined;
}
