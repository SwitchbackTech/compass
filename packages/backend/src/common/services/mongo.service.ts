import { backOff } from "exponential-backoff";
import {
  ClientSession,
  ClientSessionOptions,
  Collection,
  ConnectionClosedEvent,
  ConnectionReadyEvent,
  Db,
  MongoClient,
  ObjectId,
} from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import {
  Schema_CalendarList as Schema_CalList,
  Schema_Calendar,
} from "@core/types/calendar.types";
import { Schema_Event } from "@core/types/event.types";
import { Schema_Sync } from "@core/types/sync.types";
import { Schema_User } from "@core/types/user.types";
import { Schema_Waitlist } from "@core/types/waitlist/waitlist.types";
import { Schema_Watch } from "@core/types/watch.types";
import { Collections } from "@backend/common/constants/collections";
import { ENV } from "@backend/common/constants/env.constants";
import { waitUntilEvent } from "@backend/common/helpers/common.util";

const logger = Logger("app:mongo.service");

interface InternalClient {
  db: Db;
  client: MongoClient;
  calendar: Collection<Schema_Calendar>;
  calendarList: Collection<Schema_CalList>;
  event: Collection<Omit<Schema_Event, "_id">>;
  sync: Collection<Schema_Sync>;
  user: Collection<Schema_User>;
  waitlist: Collection<Schema_Waitlist>;
  watch: Collection<Schema_Watch>;
}

class MongoService {
  #internalClient?: InternalClient;

  get db() {
    return this.#internalClient!.db;
  }

  /**
   * calendar
   *
   * mongo collection
   */
  get calendar(): InternalClient["calendar"] {
    return this.#accessInternalCollectionProps("calendar");
  }

  /**
   * calendarList
   *
   * mongo collection
   */
  get calendarList(): InternalClient["calendarList"] {
    return this.#accessInternalCollectionProps("calendarList");
  }

  /**
   * event
   *
   * mongo collection
   */
  get event(): InternalClient["event"] {
    return this.#accessInternalCollectionProps("event");
  }

  /**
   * sync
   *
   * mongo collection
   */
  get sync(): InternalClient["sync"] {
    return this.#accessInternalCollectionProps("sync");
  }

  /**
   * user
   *
   * mongo collection
   */
  get user(): InternalClient["user"] {
    return this.#accessInternalCollectionProps("user");
  }

  /**
   * waitlist
   *
   * mongo collection
   */
  get waitlist(): InternalClient["waitlist"] {
    return this.#accessInternalCollectionProps("waitlist");
  }

  /**
   * watch
   *
   * mongo collection
   */
  get watch(): InternalClient["watch"] {
    return this.#accessInternalCollectionProps("watch");
  }

  private onConnect(client: MongoClient, useDynamicDb = false) {
    this.#internalClient = this.createInternalClient(client, useDynamicDb);

    Object.seal(this);
  }

  private onDisconnect(): void {
    logger.debug(`Disconnected from database: '${this.db.namespace}'`);
  }

  private onError(error: Error): void {
    logger.error(error.message, error);
  }

  private onReady(event: ConnectionReadyEvent): void {
    logger.debug(`Connected to database: '${event.address}'`);
  }

  private onClose(event: ConnectionClosedEvent): void {
    logger.debug(`Connection to database: '${event.address}' closed`);
  }

  private createInternalClient(
    client: MongoClient,
    useDynamicDb = false,
  ): InternalClient {
    const db = client.db(useDynamicDb ? undefined : ENV.DB);

    return {
      db,
      client,
      calendar: db.collection<Schema_Calendar>(Collections.CALENDAR),
      calendarList: db.collection<Schema_CalList>(Collections.CALENDARLIST),
      event: db.collection<Omit<Schema_Event, "_id">>(Collections.EVENT),
      sync: db.collection<Schema_Sync>(Collections.SYNC),
      user: db.collection<Schema_User>(Collections.USER),
      waitlist: db.collection<Schema_Waitlist>(Collections.WAITLIST),
      watch: db.collection<Schema_Watch>(Collections.WATCH),
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

  async start(useDynamicDb = false): Promise<MongoService> {
    if (this.#internalClient) return this;

    const client = new MongoClient(ENV.MONGO_URI, {
      serverApi: { strict: true, version: "1" },
    });

    client.on("open", (client) => this.onConnect(client, useDynamicDb));
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

  async startSession(options?: ClientSessionOptions): Promise<ClientSession> {
    return this.#internalClient!.client.startSession(options);
  }

  objectId(id?: string): ObjectId {
    return new ObjectId(id);
  }

  async recordExists(collection: string, filter: object): Promise<boolean> {
    const r = await this.db.collection(collection).findOne(filter);
    return r !== null;
  }

  async collectionExists(name: string): Promise<boolean> {
    return this.db.listCollections({ name }).hasNext();
  }
}

export default new MongoService();
