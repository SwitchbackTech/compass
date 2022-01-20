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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const errors_base_1 = require("@core/errors/errors.base");
const collections_1 = require("@backend/common/constants/collections");
const mongo_service_1 = __importDefault(require("@backend/common/services/mongo.service"));
const priority_service_helpers_1 = require("./priority.service.helpers");
class PriorityService {
    list(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const filter = { user: userId };
            const allPriorities = yield mongo_service_1.default.db
                .collection(collections_1.Collections.PRIORITY)
                .find(filter)
                .toArray();
            return allPriorities;
        });
    }
    readById(userId, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const filter = {
                _id: mongo_service_1.default.objectId(id),
                user: userId,
            };
            const priority = yield mongo_service_1.default.db
                .collection(collections_1.Collections.PRIORITY)
                .findOne(filter);
            if (priority === null) {
                return {};
            }
            return priority;
        });
    }
    create(userId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (data instanceof Array) {
                // TODO catch BulkWriteError
                // TODO confirm none exist with same name
                const response = yield mongo_service_1.default.db
                    .collection(collections_1.Collections.PRIORITY)
                    .insertMany(data);
                const priorities = priority_service_helpers_1.mapPriorityData(response.insertedIds, data, userId);
                return priorities;
            }
            else {
                const priorityExists = yield mongo_service_1.default.recordExists(collections_1.Collections.PRIORITY, {
                    user: userId,
                    name: data.name,
                });
                if (priorityExists) {
                    return new errors_base_1.BaseError("Priority Exists", `${data.name} already exists`, 
                    // 304, //todo status
                    200, //todo status
                    true);
                }
                const doc = Object.assign({}, data, { user: userId });
                const response = yield mongo_service_1.default.db
                    .collection(collections_1.Collections.PRIORITY)
                    .insertOne(doc);
                const priority = {
                    _id: response.insertedId.toString(),
                    user: userId,
                    name: data.name,
                    color: data.color,
                };
                return priority;
            }
        });
    }
    updateById(id, priority) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield mongo_service_1.default.db
                .collection(collections_1.Collections.PRIORITY)
                .findOneAndUpdate({ _id: mongo_service_1.default.objectId(id) }, { $set: priority }, { returnDocument: "after" } // the new document
            );
            if (response.value === null || response.idUpdates === 0) {
                return new errors_base_1.BaseError("Update Failed", "Ensure id is correct", 400, true);
            }
            const updatedPriority = response.value;
            return updatedPriority;
        });
    }
    deleteById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            //TODO add user to filter (?)
            const filter = { _id: mongo_service_1.default.objectId(id) };
            const response = yield mongo_service_1.default.db
                .collection(collections_1.Collections.PRIORITY)
                .deleteOne(filter);
            return response;
        });
    }
}
exports.default = new PriorityService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJpb3JpdHkuc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9wcmlvcml0eS9zZXJ2aWNlcy9wcmlvcml0eS5zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsMERBQXFEO0FBRXJELHVFQUFvRTtBQUNwRSwyRkFBa0U7QUFFbEUseUVBQTZEO0FBRTdELE1BQU0sZUFBZTtJQUNiLElBQUksQ0FBQyxNQUFjOztZQUN2QixNQUFNLE1BQU0sR0FBRyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQztZQUVoQyxNQUFNLGFBQWEsR0FBRyxNQUFNLHVCQUFZLENBQUMsRUFBRTtpQkFDeEMsVUFBVSxDQUFDLHlCQUFXLENBQUMsUUFBUSxDQUFDO2lCQUNoQyxJQUFJLENBQUMsTUFBTSxDQUFDO2lCQUNaLE9BQU8sRUFBRSxDQUFDO1lBRWIsT0FBTyxhQUFhLENBQUM7UUFDdkIsQ0FBQztLQUFBO0lBQ0ssUUFBUSxDQUNaLE1BQWMsRUFDZCxFQUFVOztZQUVWLE1BQU0sTUFBTSxHQUFHO2dCQUNiLEdBQUcsRUFBRSx1QkFBWSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7Z0JBQzlCLElBQUksRUFBRSxNQUFNO2FBQ2IsQ0FBQztZQUVGLE1BQU0sUUFBUSxHQUFHLE1BQU0sdUJBQVksQ0FBQyxFQUFFO2lCQUNuQyxVQUFVLENBQUMseUJBQVcsQ0FBQyxRQUFRLENBQUM7aUJBQ2hDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUVuQixJQUFJLFFBQVEsS0FBSyxJQUFJLEVBQUU7Z0JBQ3JCLE9BQU8sRUFBRSxDQUFDO2FBQ1g7WUFFRCxPQUFPLFFBQVEsQ0FBQztRQUNsQixDQUFDO0tBQUE7SUFFSyxNQUFNLENBQ1YsTUFBYyxFQUNkLElBQWlDOztZQUVqQyxJQUFJLElBQUksWUFBWSxLQUFLLEVBQUU7Z0JBQ3pCLDRCQUE0QjtnQkFDNUIseUNBQXlDO2dCQUN6QyxNQUFNLFFBQVEsR0FBRyxNQUFNLHVCQUFZLENBQUMsRUFBRTtxQkFDbkMsVUFBVSxDQUFDLHlCQUFXLENBQUMsUUFBUSxDQUFDO3FCQUNoQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBRXBCLE1BQU0sVUFBVSxHQUFHLDBDQUFlLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQ3ZFLE9BQU8sVUFBVSxDQUFDO2FBQ25CO2lCQUFNO2dCQUNMLE1BQU0sY0FBYyxHQUFHLE1BQU0sdUJBQVksQ0FBQyxZQUFZLENBQ3BELHlCQUFXLENBQUMsUUFBUSxFQUNwQjtvQkFDRSxJQUFJLEVBQUUsTUFBTTtvQkFDWixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7aUJBQ2hCLENBQ0YsQ0FBQztnQkFDRixJQUFJLGNBQWMsRUFBRTtvQkFDbEIsT0FBTyxJQUFJLHVCQUFTLENBQ2xCLGlCQUFpQixFQUNqQixHQUFHLElBQUksQ0FBQyxJQUFJLGlCQUFpQjtvQkFDN0IscUJBQXFCO29CQUNyQixHQUFHLEVBQUUsYUFBYTtvQkFDbEIsSUFBSSxDQUNMLENBQUM7aUJBQ0g7Z0JBQ0QsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7Z0JBQ3RELE1BQU0sUUFBUSxHQUFHLE1BQU0sdUJBQVksQ0FBQyxFQUFFO3FCQUNuQyxVQUFVLENBQUMseUJBQVcsQ0FBQyxRQUFRLENBQUM7cUJBQ2hDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFFbEIsTUFBTSxRQUFRLEdBQW9CO29CQUNoQyxHQUFHLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUU7b0JBQ25DLElBQUksRUFBRSxNQUFNO29CQUNaLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtvQkFDZixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7aUJBQ2xCLENBQUM7Z0JBQ0YsT0FBTyxRQUFRLENBQUM7YUFDakI7UUFDSCxDQUFDO0tBQUE7SUFFSyxVQUFVLENBQ2QsRUFBVSxFQUNWLFFBQXFCOztZQUVyQixNQUFNLFFBQVEsR0FBRyxNQUFNLHVCQUFZLENBQUMsRUFBRTtpQkFDbkMsVUFBVSxDQUFDLHlCQUFXLENBQUMsUUFBUSxDQUFDO2lCQUNoQyxnQkFBZ0IsQ0FDZixFQUFFLEdBQUcsRUFBRSx1QkFBWSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUNsQyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsRUFDbEIsRUFBRSxjQUFjLEVBQUUsT0FBTyxFQUFFLENBQUMsbUJBQW1CO2FBQ2hELENBQUM7WUFFSixJQUFJLFFBQVEsQ0FBQyxLQUFLLEtBQUssSUFBSSxJQUFJLFFBQVEsQ0FBQyxTQUFTLEtBQUssQ0FBQyxFQUFFO2dCQUN2RCxPQUFPLElBQUksdUJBQVMsQ0FBQyxlQUFlLEVBQUUsc0JBQXNCLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQzFFO1lBRUQsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQztZQUN2QyxPQUFPLGVBQWUsQ0FBQztRQUN6QixDQUFDO0tBQUE7SUFFSyxVQUFVLENBQUMsRUFBVTs7WUFDekIsNkJBQTZCO1lBQzdCLE1BQU0sTUFBTSxHQUFHLEVBQUUsR0FBRyxFQUFFLHVCQUFZLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDbEQsTUFBTSxRQUFRLEdBQUcsTUFBTSx1QkFBWSxDQUFDLEVBQUU7aUJBQ25DLFVBQVUsQ0FBQyx5QkFBVyxDQUFDLFFBQVEsQ0FBQztpQkFDaEMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3JCLE9BQU8sUUFBUSxDQUFDO1FBQ2xCLENBQUM7S0FBQTtDQUNGO0FBRUQsa0JBQWUsSUFBSSxlQUFlLEVBQUUsQ0FBQyJ9