"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
//@ts-nocheck
const mongodb_1 = require("mongodb");
const winston_logger_1 = require("@core/logger/winston.logger");
const logger = (0, winston_logger_1.Logger)("app:mongo.service");
const uri = process.env["MONGO_URI"] || "mongodb://localhost:27017/";
const dbName = process.env["DB_NAME"] || "test";
class MongoService {
  constructor() {
    this.count = 0;
    this.options = {
      useNewUrlParser: true,
    };
    this._connect = () => {
      logger.debug("Attempting MongoDB connection");
      mongodb_1.MongoClient.connect(uri, this.options)
        .then((clientInstance) => {
          logger.debug(`Connected to '${dbName}' database`);
          this.client = clientInstance;
          this.db = this.client.db(dbName);
          this.db["ObjectId"] = mongodb_1.ObjectId;
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
    this.objectId = (id) => {
      return new mongodb_1.ObjectId(id);
    };
    this.recordExists = (collection, filter) =>
      (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const r = yield this.db.collection(collection).findOne(filter);
        return r !== null;
      });
    this._connect();
  }
}
exports.default = new MongoService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uZ28uc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2JhY2tlbmQvc3JjL2NvbW1vbi9zZXJ2aWNlcy9tb25nby5zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLGFBQWE7QUFDYixxQ0FBb0Q7QUFDcEQsZ0VBQXFEO0FBRXJELE1BQU0sTUFBTSxHQUFHLElBQUEsdUJBQU0sRUFBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBRTNDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLElBQUksNEJBQTRCLENBQUM7QUFDckUsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxNQUFNLENBQUM7QUFFaEQsTUFBTSxZQUFZO0lBUWhCO1FBUFEsVUFBSyxHQUFHLENBQUMsQ0FBQztRQUNWLFlBQU8sR0FBRztZQUNoQixlQUFlLEVBQUUsSUFBSTtTQUN0QixDQUFDO1FBUUYsYUFBUSxHQUFHLEdBQUcsRUFBRTtZQUNkLE1BQU0sQ0FBQyxLQUFLLENBQUMsK0JBQStCLENBQUMsQ0FBQztZQUM5QyxxQkFBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQztpQkFDbkMsSUFBSSxDQUFDLENBQUMsY0FBYyxFQUFFLEVBQUU7Z0JBQ3ZCLE1BQU0sQ0FBQyxLQUFLLENBQUMsaUJBQWlCLE1BQU0sWUFBWSxDQUFDLENBQUM7Z0JBQ2xELElBQUksQ0FBQyxNQUFNLEdBQUcsY0FBYyxDQUFDO2dCQUM3QixJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNqQyxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLGtCQUFRLENBQUM7WUFDakMsQ0FBQyxDQUFDO2lCQUNELEtBQUssQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO2dCQUNiLE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQztnQkFDdkIsTUFBTSxDQUFDLElBQUksQ0FDVCxnREFBZ0QsRUFBRSxJQUFJO3FCQUNuRCxLQUFLLFVBQVUsWUFBWSxZQUFZLEVBQzFDLEdBQUcsQ0FDSixDQUFDO2dCQUNGLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFlBQVksR0FBRyxJQUFJLENBQUMsQ0FBQztZQUNqRCxDQUFDLENBQUMsQ0FBQztRQUNQLENBQUMsQ0FBQztRQUVGLGFBQVEsR0FBRyxDQUFDLEVBQVUsRUFBWSxFQUFFO1lBQ2xDLE9BQU8sSUFBSSxrQkFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzFCLENBQUMsQ0FBQztRQUVGLGlCQUFZLEdBQUcsQ0FBTyxVQUFrQixFQUFFLE1BQWMsRUFBRSxFQUFFO1lBQzFELE1BQU0sQ0FBQyxHQUFHLE1BQU0sSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQy9ELE9BQU8sQ0FBQyxLQUFLLElBQUksQ0FBQztRQUNwQixDQUFDLENBQUEsQ0FBQztRQTlCQSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDbEIsQ0FBQztDQW9ERjtBQUVELGtCQUFlLElBQUksWUFBWSxFQUFFLENBQUMifQ==
