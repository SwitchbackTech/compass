import { backOff } from "exponential-backoff";
import {
  Collection,
  ConnectionClosedEvent,
  ConnectionReadyEvent,
  Db,
  MongoClient,
  ObjectId,
} from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import { Schema_Event } from "@core/types/event.types";
import { Schema_Sync } from "@core/types/sync.types";
import { Schema_User } from "@core/types/user.types";
import { Schema_Waitlist } from "@core/types/waitlist/waitlist.types";
import { waitUntilEvent } from "@backend/common/helpers/common.util";
import { Collections } from "../constants/collections";
import { ENV } from "../constants/env.constants";

const logger = Logger("app:mongo.service");

interface InternalClient {
  db: Db;
  client: MongoClient;
  event: Collection<Schema_Event>;
  sync: Collection<Schema_Sync>;
  user: Collection<Schema_User>;
  waitlist: Collection<Schema_Waitlist>;
}

class MongoService {
  #internalClient?: InternalClient;

  get db() {
    return this.#internalClient!.db;
  }

  /**
   * event
   *
   * mongo collection
   */
  get event(): Collection<Schema_Event> {
    return this.#accessInternalCollectionProps("event");
  }

  /**
   * sync
   *
   * mongo collection
   */
  get sync(): Collection<Schema_Sync> {
    return this.#accessInternalCollectionProps("sync");
  }

  /**
   * user
   *
   * mongo collection
   */
  get user(): Collection<Schema_User> {
    return this.#accessInternalCollectionProps("user");
  }

  /**
   * waitlist
   *
   * mongo collection
   */
  get waitlist(): Collection<Schema_Waitlist> {
    return this.#accessInternalCollectionProps("waitlist");
  }

  private onConnect(client: MongoClient) {
    this.#internalClient = this.createInternalClient(client);

    Object.seal(this);
  }

  private onDisconnect(): void {
    logger.debug(`Disconnected from database: '${this.db.namespace}'`);
  }

  private onError(error: Error): void {
    console.log("hey there!");
    logger.error(error.message, error);
  }

  private onReady(event: ConnectionReadyEvent): void {
    logger.debug(`Connected to database: '${event.address}'`);
  }

  private onClose(event: ConnectionClosedEvent): void {
    logger.debug(`Connection to database: '${event.address}' closed`);
  }

  private createInternalClient(client: MongoClient): InternalClient {
    const db = client.db(ENV.DB);

    return {
      db,
      client,
      event: db.collection<Schema_Event>(Collections.EVENT),
      sync: db.collection<Schema_Sync>(Collections.SYNC),
      user: db.collection<Schema_User>(Collections.USER),
      waitlist: db.collection<Schema_Waitlist>(Collections.WAITLIST),
    };
  }

  #accessInternalCollectionProps<K extends keyof InternalClient>(
    key: K,
  ): InternalClient[K] {
    if (!this.#internalClient) {
      throw new Error("did you forget to call `start`?");
    }

    return this.#internalClient[key];
  }

  private onRetryConnect(
    error: Error,
    attempts: number,
    timeout: number,
  ): boolean {
    const seconds = attempts * 5;
    const retry = seconds * 1000 < timeout;

    if (retry) {
      logger.warn(
        `MongoDB connection unsuccessful (will retry #${attempts} after ${seconds} seconds):`,
        error,
      );
    }

    return retry;
  }

  async start(uri: string = ENV.MONGO_URI): Promise<MongoService> {
    if (this.#internalClient) return this;

    const client = new MongoClient(uri, {
      serverApi: { strict: true, version: "1" },
    });

    client.on("open", this.onConnect.bind(this));
    client.on("close", this.onDisconnect.bind(this));
    client.on("error", this.onError.bind(this));
    client.on("connectionClosed", this.onClose.bind(this));
    client.on("connectionReady", this.onReady.bind(this));

    return waitUntilEvent<MongoClient[], MongoService>(
      client,
      "open",
      30000,
      () => this.reconnect(client),
      () => new Promise((resolve) => process.nextTick(() => resolve(this))),
    );
  }

  async reconnect(client: MongoClient): Promise<MongoClient> {
    return backOff(client.connect.bind(client), {
      jitter: "full",
      delayFirstAttempt: true,
      startingDelay: 1000,
      timeMultiple: 5,
      retry: (...args) => this.onRetryConnect(...args, 25000),
    });
  }

  async stop(): Promise<void> {
    if (!this.#internalClient) return;

    const client = this.#accessInternalCollectionProps("client");

    await client.close();

    client.removeAllListeners();

    this.#internalClient = undefined;
  }

  objectId = (id: string): ObjectId => {
    return new ObjectId(id);
  };

  recordExists = async (collection: string, filter: object) => {
    const r = await this.db.collection(collection).findOne(filter);
    return r !== null;
  };
}

export default new MongoService();
