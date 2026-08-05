import { mergeProviderMetadataPreservingIcalUid } from "@sync/domain/provider-metadata";

describe("mergeProviderMetadataPreservingIcalUid", () => {
  it("keeps existing iCalUID when incoming is null (busy default)", () => {
    expect(
      mergeProviderMetadataPreservingIcalUid(null, {
        iCalUID: "kept@google.com",
      }),
    ).toEqual({ iCalUID: "kept@google.com" });
  });

  it("stays null when incoming is null and nothing was stored", () => {
    expect(mergeProviderMetadataPreservingIcalUid(null, null)).toBeNull();
    expect(mergeProviderMetadataPreservingIcalUid(null, undefined)).toBeNull();
  });

  it("clears transparency while preserving iCalUID when becoming busy", () => {
    expect(
      mergeProviderMetadataPreservingIcalUid(null, {
        transparency: "transparent",
        iCalUID: "kept@google.com",
      }),
    ).toEqual({ iCalUID: "kept@google.com" });
  });

  it("merges existing iCalUID into an incoming transparency-only bag", () => {
    expect(
      mergeProviderMetadataPreservingIcalUid(
        { transparency: "transparent" },
        { iCalUID: "kept@google.com" },
      ),
    ).toEqual({
      transparency: "transparent",
      iCalUID: "kept@google.com",
    });
  });

  it("lets an incoming iCalUID replace the stored one", () => {
    expect(
      mergeProviderMetadataPreservingIcalUid(
        { iCalUID: "new@google.com" },
        { iCalUID: "old@google.com", transparency: "transparent" },
      ),
    ).toEqual({ iCalUID: "new@google.com" });
  });

  it("uses an incoming bag that already carries both facts", () => {
    expect(
      mergeProviderMetadataPreservingIcalUid(
        { transparency: "transparent", iCalUID: "free@google.com" },
        { iCalUID: "old@google.com" },
      ),
    ).toEqual({
      transparency: "transparent",
      iCalUID: "free@google.com",
    });
  });
});
