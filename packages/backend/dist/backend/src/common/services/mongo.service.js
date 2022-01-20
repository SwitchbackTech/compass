"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const common_logger_1 = require("../logger/common.logger");
const logger = common_logger_1.Logger("app:mongo.service");
const uri = process.env.MONGO_URI || "mongodb://localhost:27017/";
const dbName = process.env.DB_NAME || "test";
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
                logger.warn(`MongoDB connection unsuccessful (will retry #${++this
                    .count} after ${retrySeconds} seconds):`, err);
                setTimeout(this._connect, retrySeconds * 1000);
            });
        };
        this.objectId = (id) => {
            return new mongodb_1.ObjectId(id);
        };
        this.recordExists = (collection, filter) => __awaiter(this, void 0, void 0, function* () {
            const r = yield this.db.collection(collection).findOne(filter);
            return r !== null;
        });
        this._connect();
    }
}
exports.default = new MongoService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uZ28uc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9jb21tb24vc2VydmljZXMvbW9uZ28uc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUFBLHFDQUFvRDtBQUVwRCwyREFBaUQ7QUFFakQsTUFBTSxNQUFNLEdBQUcsc0JBQU0sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBRTNDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxJQUFJLDRCQUE0QixDQUFDO0FBQ2xFLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxJQUFJLE1BQU0sQ0FBQztBQUU3QyxNQUFNLFlBQVk7SUFRaEI7UUFQUSxVQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQ1YsWUFBTyxHQUFHO1lBQ2hCLGVBQWUsRUFBRSxJQUFJO1NBQ3RCLENBQUM7UUFRRixhQUFRLEdBQUcsR0FBRyxFQUFFO1lBQ2QsTUFBTSxDQUFDLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1lBQzlDLHFCQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDO2lCQUNuQyxJQUFJLENBQUMsQ0FBQyxjQUFjLEVBQUUsRUFBRTtnQkFDdkIsTUFBTSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsTUFBTSxZQUFZLENBQUMsQ0FBQztnQkFDbEQsSUFBSSxDQUFDLE1BQU0sR0FBRyxjQUFjLENBQUM7Z0JBQzdCLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ2pDLElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsa0JBQVEsQ0FBQztZQUNqQyxDQUFDLENBQUM7aUJBQ0QsS0FBSyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7Z0JBQ2IsTUFBTSxZQUFZLEdBQUcsQ0FBQyxDQUFDO2dCQUN2QixNQUFNLENBQUMsSUFBSSxDQUNULGdEQUFnRCxFQUFFLElBQUk7cUJBQ25ELEtBQUssVUFBVSxZQUFZLFlBQVksRUFDMUMsR0FBRyxDQUNKLENBQUM7Z0JBQ0YsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsWUFBWSxHQUFHLElBQUksQ0FBQyxDQUFDO1lBQ2pELENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQyxDQUFDO1FBRUYsYUFBUSxHQUFHLENBQUMsRUFBVSxFQUFZLEVBQUU7WUFDbEMsT0FBTyxJQUFJLGtCQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDMUIsQ0FBQyxDQUFDO1FBRUYsaUJBQVksR0FBRyxDQUFPLFVBQWtCLEVBQUUsTUFBYyxFQUFFLEVBQUU7WUFDMUQsTUFBTSxDQUFDLEdBQUcsTUFBTSxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDL0QsT0FBTyxDQUFDLEtBQUssSUFBSSxDQUFDO1FBQ3BCLENBQUMsQ0FBQSxDQUFDO1FBOUJBLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNsQixDQUFDO0NBb0RGO0FBRUQsa0JBQWUsSUFBSSxZQUFZLEVBQUUsQ0FBQyJ9