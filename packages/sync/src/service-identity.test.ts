import { SYNC_SERVICE_NAME, syncServiceIdentity } from "@sync/service-identity";

describe("Sync service identity", () => {
  it("exposes the canonical service name", () => {
    expect(SYNC_SERVICE_NAME).toBe("compass-sync");
    expect(syncServiceIdentity.name).toBe(SYNC_SERVICE_NAME);
  });
});
