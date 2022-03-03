import { Db, MongoClient, ObjectId } from "mongodb";
declare class MongoService {
  private count;
  private options;
  client: MongoClient | undefined;
  db: Db;
  constructor();
  _connect: () => void;
  objectId: (id: string) => ObjectId;
  recordExists: (collection: string, filter: object) => Promise<boolean>;
}
declare const _default: MongoService;
export default _default;
//# sourceMappingURL=mongo.service.d.ts.map
