import { Db, MongoClient, ObjectId } from "mongodb";
import { Logger } from "@core/logger/winston.logger";

import { ENV } from "../constants/env.constants";

const logger = Logger("app:mongo.service");

const dbName = ENV.DB;

class MongoService {
  private count = 0;
  private options = {
    useNewUrlParser: true,
  };
  public client: MongoClient | undefined;
  public db!: Db;

  constructor() {
    this._connect();
  }

  _connect = () => {
    //@ts-ignore
    MongoClient.connect(ENV.MONGO_URI, this.options)
      .then((clientInstance) => {
        logger.debug(`Connected to database: '${dbName}'`);
        this.client = clientInstance;
        this.db = this.client.db(dbName);
        //@ts-ignore
        this.db["ObjectId"] = ObjectId;
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
