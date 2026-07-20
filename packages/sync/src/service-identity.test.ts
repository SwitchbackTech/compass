import { describeSyncService } from "@sync/app";
import { SYNC_SERVICE_NAME, syncServiceIdentity } from "@sync/service-identity";

describe("Sync service scaffold", () => {
  it("exposes the canonical service name", () => {
    expect(SYNC_SERVICE_NAME).toBe("compass-sync");
    expect(syncServiceIdentity.name).toBe(SYNC_SERVICE_NAME);
  });

  it("loads and describes itself without side effects", () => {
    expect(describeSyncService()).toBe("compass-sync scaffold ready");
  });
});
