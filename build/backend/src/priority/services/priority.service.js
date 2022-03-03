"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const errors_base_1 = require("@core/errors/errors.base");
const collections_1 = require("@backend/common/constants/collections");
const mongo_service_1 = (0, tslib_1.__importDefault)(
  require("@backend/common/services/mongo.service")
);
const priority_service_helpers_1 = require("./priority.service.helpers");
class PriorityService {
  list(userId) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      const filter = { user: userId };
      const allPriorities = yield mongo_service_1.default.db
        .collection(collections_1.Collections.PRIORITY)
        .find(filter)
        .toArray();
      return allPriorities;
    });
  }
  readById(userId, id) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
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
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      if (data instanceof Array) {
        // TODO catch BulkWriteError
        // TODO confirm none exist with same name
        const response = yield mongo_service_1.default.db
          .collection(collections_1.Collections.PRIORITY)
          .insertMany(data);
        const priorities = (0, priority_service_helpers_1.mapPriorityData)(
          response.insertedIds,
          data,
          userId
        );
        return priorities;
      } else {
        const priorityExists = yield mongo_service_1.default.recordExists(
          collections_1.Collections.PRIORITY,
          {
            user: userId,
            name: data.name,
          }
        );
        if (priorityExists) {
          return new errors_base_1.BaseError(
            "Priority Exists",
            `${data.name} already exists`,
            // 304, //todo status
            200, //todo status
            true
          );
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
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      const response = yield mongo_service_1.default.db
        .collection(collections_1.Collections.PRIORITY)
        .findOneAndUpdate(
          { _id: mongo_service_1.default.objectId(id) },
          { $set: priority },
          { returnDocument: "after" } // the new document
        );
      //@ts-ignore
      if (response.value === null || response.idUpdates === 0) {
        return new errors_base_1.BaseError(
          "Update Failed",
          "Ensure id is correct",
          400,
          true
        );
      }
      const updatedPriority = response.value;
      return updatedPriority;
    });
  }
  deleteById(id) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJpb3JpdHkuc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2JhY2tlbmQvc3JjL3ByaW9yaXR5L3NlcnZpY2VzL3ByaW9yaXR5LnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsMERBQXFEO0FBQ3JELHVFQUFvRTtBQUNwRSx3R0FBa0U7QUFFbEUseUVBQTZEO0FBRTdELE1BQU0sZUFBZTtJQUNiLElBQUksQ0FBQyxNQUFjOztZQUN2QixNQUFNLE1BQU0sR0FBRyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQztZQUVoQyxNQUFNLGFBQWEsR0FBRyxNQUFNLHVCQUFZLENBQUMsRUFBRTtpQkFDeEMsVUFBVSxDQUFDLHlCQUFXLENBQUMsUUFBUSxDQUFDO2lCQUNoQyxJQUFJLENBQUMsTUFBTSxDQUFDO2lCQUNaLE9BQU8sRUFBRSxDQUFDO1lBRWIsT0FBTyxhQUFhLENBQUM7UUFDdkIsQ0FBQztLQUFBO0lBRUssUUFBUSxDQUNaLE1BQWMsRUFDZCxFQUFVOztZQUVWLE1BQU0sTUFBTSxHQUFHO2dCQUNiLEdBQUcsRUFBRSx1QkFBWSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7Z0JBQzlCLElBQUksRUFBRSxNQUFNO2FBQ2IsQ0FBQztZQUVGLE1BQU0sUUFBUSxHQUFHLE1BQU0sdUJBQVksQ0FBQyxFQUFFO2lCQUNuQyxVQUFVLENBQUMseUJBQVcsQ0FBQyxRQUFRLENBQUM7aUJBQ2hDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUVuQixJQUFJLFFBQVEsS0FBSyxJQUFJLEVBQUU7Z0JBQ3JCLE9BQU8sRUFBRSxDQUFDO2FBQ1g7WUFFRCxPQUFPLFFBQVEsQ0FBQztRQUNsQixDQUFDO0tBQUE7SUFFSyxNQUFNLENBQ1YsTUFBYyxFQUNkLElBQWlDOztZQUVqQyxJQUFJLElBQUksWUFBWSxLQUFLLEVBQUU7Z0JBQ3pCLDRCQUE0QjtnQkFDNUIseUNBQXlD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
