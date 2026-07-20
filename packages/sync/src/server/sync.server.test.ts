import { NodeEnv } from "@core/constants/core.constants";
import { createSyncService, type SyncService } from "@sync/app";
import { type SyncConfig } from "@sync/config/sync.config";
import { type AddressInfo } from "node:net";

const testConfig = (overrides: Partial<SyncConfig> = {}): SyncConfig =>
  ({
    NODE_ENV: NodeEnv.Test,
    PORT: 0,
    MONGO_URI: "mongodb://localhost:27017/compass_sync",
    INTERNAL_AUTH_TOKEN: "token",
    CALLBACK_BASE_URL: "http://localhost:3010",
    EXECUTION: "passive",
    MAX_CONCURRENCY: 4,
    ...overrides,
  }) as SyncConfig;

async function listen(service: SyncService): Promise<string> {
  await new Promise<void>((resolve) => service.httpServer.listen(0, resolve));
  const { port } = service.httpServer.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

describe("Sync HTTP server health endpoints", () => {
  let service: SyncService;

  afterEach(async () => {
    await service.shutdown.shutdown();
  });

  it("serves liveness with structured, content-free identity", async () => {
    service = createSyncService(testConfig({ EXECUTION: "passive" }));
    const base = await listen(service);

    const res = await fetch(`${base}/health/live`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: "alive",
      service: "compass-sync",
      environment: NodeEnv.Test,
      execution: "passive",
    });
  });

  it("reports not-ready with 503 while no dependency checks are registered", async () => {
    service = createSyncService(testConfig());
    const base = await listen(service);

    const res = await fetch(`${base}/health/ready`);
    expect(res.status).toBe(503);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("not_ready");
  });

  it("reports ready with 200 once a registered dependency check passes", async () => {
    service = createSyncService(testConfig());
    service.readiness.register("storage", () => true);
    const base = await listen(service);

    const res = await fetch(`${base}/health/ready`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("ready");
  });

  it("reflects the active execution mode on liveness", async () => {
    service = createSyncService(testConfig({ EXECUTION: "active" }));
    const base = await listen(service);

    const res = await fetch(`${base}/health/live`);
    const body = (await res.json()) as { execution: string };
    expect(body.execution).toBe("active");
  });

  it("closes the HTTP server on graceful shutdown", async () => {
    service = createSyncService(testConfig());
    await listen(service);
    expect(service.httpServer.listening).toBe(true);

    const errors = await service.shutdown.shutdown();
    expect(errors).toEqual([]);
    expect(service.httpServer.listening).toBe(false);
  });
});
