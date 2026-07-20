import { type Db, MongoClient } from "mongodb";
import { NodeEnv } from "@core/constants/core.constants";
import { Logger } from "@core/logger/winston.logger";
import { installIndexManifest } from "@sync/storage/index-manifest";

const logger = Logger("sync:mongo");

// Mongo codes that mean "the database user is not authorized" — the expected,
// wanted outcome when Sync probes a database it must not reach.
const UNAUTHORIZED_CODES = new Set([13, 8000]);

export interface SyncMongoOptions {
  readonly uri: string;
  // Database Sync owns. Defaults to the database encoded in the URI.
  readonly databaseName?: string;
  // A database Sync's least-privilege user must NOT be able to read (the
  // Compass API's database). Startup fails if Sync can reach it.
  readonly forbiddenDatabaseName: string;
  readonly nodeEnv: NodeEnv;
}

// Owns the connection to the isolated `compass_sync` database (ledger S11).
// It installs index manifests, verifies the least-privilege user, and never
// makes cross-database calls into the Compass API's data
// (01-domain-model.md; 00-architecture ownership boundary).
export class SyncMongoService {
  #client?: MongoClient;
  #db?: Db;

  get db(): Db {
    if (!this.#db) throw new Error("SyncMongoService is not connected");
    return this.#db;
  }

  get client(): MongoClient {
    if (!this.#client) throw new Error("SyncMongoService is not connected");
    return this.#client;
  }

  get isConnected(): boolean {
    return this.#db !== undefined;
  }

  async connect(options: SyncMongoOptions): Promise<void> {
    const client = new MongoClient(options.uri);
    await client.connect();
    this.#client = client;
    this.#db = options.databaseName
      ? client.db(options.databaseName)
      : client.db();

    try {
      await this.verifyLeastPrivilege(options);
      await installIndexManifest(this.#db);
    } catch (error) {
      // A failed startup must not leave an open client behind.
      await this.disconnect();
      throw error;
    }
  }

  // In staging/production the Sync user is scoped to `compass_sync`, so a read
  // of the Compass API database must be denied. Local dev / in-memory tests
  // have no auth, so the check would false-positive; skip it there and rely on
  // the injectable unit test for the logic.
  private async verifyLeastPrivilege(options: SyncMongoOptions): Promise<void> {
    const enforced =
      options.nodeEnv === NodeEnv.Staging ||
      options.nodeEnv === NodeEnv.Production;
    if (!enforced) {
      logger.info(
        `Skipping least-privilege check in ${options.nodeEnv} (no scoped auth)`,
      );
      return;
    }

    // Use a resource-scoped operation, not `ping`: `ping` is handshake-exempt
    // and MongoDB never authorization-checks it, so it resolves for any user
    // and would make this guard fire even for a correctly-scoped user.
    // `listCollections` requires the `listCollections` privilege on the target
    // database, so a scoped Sync user is denied with code 13.
    await assertForbiddenDatabaseUnreachable(() =>
      this.#client!.db(options.forbiddenDatabaseName)
        .listCollections({}, { nameOnly: true })
        .toArray(),
    );
  }

  async disconnect(): Promise<void> {
    await this.#client?.close();
    this.#client = undefined;
    this.#db = undefined;
  }
}

// Runs a probe that MUST be rejected for an authorization reason. If the probe
// resolves, the user is over-privileged and startup must fail. A non-auth
// rejection (network, etc.) is rethrown unchanged.
export async function assertForbiddenDatabaseUnreachable(
  probe: () => Promise<unknown>,
): Promise<void> {
  try {
    await probe();
  } catch (error) {
    if (isUnauthorizedError(error)) return;
    throw error;
  }
  throw new Error(
    "Sync database user can read the Compass API database; refusing to start with excessive privileges",
  );
}

function isUnauthorizedError(error: unknown): boolean {
  const code = (error as { code?: number } | null)?.code;
  return code !== undefined && UNAUTHORIZED_CODES.has(code);
}
