import { Collection, Db, MongoClient, ObjectId } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import { Schema_Sync } from "@core/types/sync.types";
import { Schema_User } from "@core/types/user.types";
import { Schema_Event } from "@core/types/event.types";

import { ENV } from "../constants/env.constants";
import { Collections } from "../constants/collections";

const logger = Logger("app:mongo.service");

class MongoService {
  private count = 0;
  public client: MongoClient | undefined;
  public db!: Db;

  // collections
  public event!: Collection<Schema_Event>;
  public sync!: Collection<Schema_Sync>;
  public user!: Collection<Schema_User>;

  constructor() {
    this._connect();
  }
  _connect = () => {
    MongoClient.connect(ENV.MONGO_URI, {
      serverApi: { strict: true, version: "1" },
    })
      .then((clientInstance) => {
        this.client = clientInstance;
        this.db = this.client.db(ENV.DB);
        logger.debug(`Connected to database: '${this.db.namespace}'`);

        this.event = this.db.collection<Schema_Event>(Collections.EVENT);
        this.sync = this.db.collection<Schema_Sync>(Collections.SYNC);
        this.user = this.db.collection<Schema_User>(Collections.USER);
      })
      .catch((err) => {
        const retrySeconds = 5;
        logger.warn(
          `MongoDB connection unsuccessful (will retry #${++this
            .count} after ${retrySeconds} seconds):`,
          err
        );
        setTimeout(this._connect, retrySeconds * 1000);
      });
  };

  isConnected = () => this.client !== undefined;

  objectId = (id: string): ObjectId => {
    return new ObjectId(id);
  };

  recordExists = async (collection: string, filter: object) => {
    const r = await this.db.collection(collection).findOne(filter);
    return r !== null;
  };
}

export default new MongoService();
