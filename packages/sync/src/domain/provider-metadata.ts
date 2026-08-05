// Merge rules for the stored provider-fact bag on sync upsert:
// - Incoming wins for transparency (busy↔free must clear/set it).
// - Incoming iCalUID wins when present.
// - If incoming omits iCalUID but the existing row has one, keep it so a
//   sparse re-read cannot wipe a backfill or a prior full read.
// - Incoming null with no existing iCalUID stays null (busy default).
export function mergeProviderMetadataPreservingIcalUid(
  incoming: Record<string, string> | null,
  existing: Record<string, string> | null | undefined,
): Record<string, string> | null {
  const existingUid =
    existing && typeof existing["iCalUID"] === "string"
      ? existing["iCalUID"]
      : undefined;

  if (incoming === null) {
    return existingUid ? { iCalUID: existingUid } : null;
  }

  if (incoming["iCalUID"]) {
    return { ...incoming };
  }

  if (existingUid) {
    return { ...incoming, iCalUID: existingUid };
  }

  return Object.keys(incoming).length > 0 ? { ...incoming } : null;
}
