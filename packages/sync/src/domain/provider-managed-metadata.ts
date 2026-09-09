const PROVIDER_MANAGED_METADATA_KEY = "providerManaged";
const PROVIDER_MANAGED_METADATA_VALUE = "true";

export function providerManagedMetadataEntry(
  providerManaged: boolean | undefined,
): { providerManaged?: string } {
  return providerManaged
    ? { [PROVIDER_MANAGED_METADATA_KEY]: PROVIDER_MANAGED_METADATA_VALUE }
    : {};
}

export function isProviderManagedMetadata(
  metadata: Record<string, string> | undefined | null,
): boolean {
  return (
    metadata?.[PROVIDER_MANAGED_METADATA_KEY] ===
    PROVIDER_MANAGED_METADATA_VALUE
  );
}
