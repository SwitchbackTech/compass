import { refreshConnectionStates } from "@scripts/commands/refresh-connection-states/refresh";
import { ObjectId } from "mongodb";
import { setupSyncStorage } from "@sync/__tests__/helpers/storage";
import { CredentialRepository } from "@sync/storage/repositories/credential.repository";
import { ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";
import { beforeEach, describe, expect, it } from "bun:test";

const objectId = () => new ObjectId().toHexString();

describe("refreshConnectionStates", () => {
  const storage = setupSyncStorage(import.meta.url);
  let connections: ProviderConnectionRepository;
  let credentials: CredentialRepository;

  beforeEach(() => {
    connections = new ProviderConnectionRepository(storage.db());
    credentials = new CredentialRepository(storage.db());
  });

  async function seedConnection(withCredential: boolean) {
    const connection = await connections.upsertByProviderAccount({
      tenantId: objectId(),
      principalId: objectId(),
      provider: "google",
      account: {
        providerAccountId: objectId(),
        email: "user@example.com",
        displayName: "User",
      },
      capabilities: ["readEvents", "readBusy", "writeEvents"],
      state: "importing",
      stateReason: null,
      lastSyncedAt: null,
      lastHealthyAt: null,
    });
    if (withCredential) {
      await credentials.store({
        connectionId: connection._id,
        provider: "google",
        refreshToken: "refresh",
        scopes: ["https://www.googleapis.com/auth/calendar.events"],
      });
    }
    return connection;
  }

  it("dry-run reports the transition a credential-less connection needs, without writing it", async () => {
    const doomed = await seedConnection(false);

    const report = await refreshConnectionStates(storage.db(), {
      dryRun: true,
    });

    expect(report.changed).toBe(1);
    expect(report.transitions["importing->actionRequired"]).toBe(1);
    const stillStored = await connections.findById(
      doomed.tenantId,
      doomed.principalId,
      doomed._id,
    );
    expect(stillStored?.state).toBe("importing");
  });

  it("apply persists the derived state and is idempotent on rerun", async () => {
    const doomed = await seedConnection(false);

    const first = await refreshConnectionStates(storage.db(), {
      dryRun: false,
    });
    expect(first.changed).toBe(1);

    const updated = await connections.findById(
      doomed.tenantId,
      doomed.principalId,
      doomed._id,
    );
    expect(updated?.state).toBe("actionRequired");
    expect(updated?.stateReason).toBe("authorizationRevoked");

    const second = await refreshConnectionStates(storage.db(), {
      dryRun: false,
    });
    expect(second.changed).toBe(0);
  });

  it("only flags the connection that actually needs a transition, in a mixed batch", async () => {
    const doomed = await seedConnection(false);
    const credentialed = await seedConnection(true);

    const report = await refreshConnectionStates(storage.db(), {
      dryRun: false,
    });

    expect(report.scanned).toBe(2);
    expect(report.changed).toBe(1);
    expect(report.samples.map((s) => s.id)).toEqual([doomed._id]);
    const untouched = await connections.findById(
      credentialed.tenantId,
      credentialed.principalId,
      credentialed._id,
    );
    // Unimported but credentialed stays on its own natural derived state
    // (connecting/importing), never forced anywhere by this pass.
    expect(untouched?.state).not.toBe("actionRequired");
  });
});
