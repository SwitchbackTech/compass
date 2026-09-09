import {
  isProviderManagedMetadata,
  providerManagedMetadataEntry,
} from "@sync/domain/provider-managed-metadata";
import { describe, expect, it } from "bun:test";

describe("providerManagedMetadata", () => {
  it("writes and reads the same metadata flag", () => {
    expect(providerManagedMetadataEntry(true)).toEqual({
      providerManaged: "true",
    });
    expect(providerManagedMetadataEntry(false)).toEqual({});
    expect(isProviderManagedMetadata({ providerManaged: "true" })).toBe(true);
    expect(isProviderManagedMetadata({ providerManaged: "false" })).toBe(false);
    expect(isProviderManagedMetadata({})).toBe(false);
  });
});
