"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const errors_base_1 = require("@core/errors/errors.base");
const status_codes_1 = require("@core/errors/status.codes");
const collections_1 = require("@backend/common/constants/collections");
const mongo_service_1 = (0, tslib_1.__importDefault)(
  require("@backend/common/services/mongo.service")
);
class CalendarService {
  create(userId, calendarList) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      const calListData = calendarList;
      if (!calendarList.user) {
        calListData.user = userId;
      }
      // TODO validate
      try {
        const response = yield mongo_service_1.default.db
          .collection(collections_1.Collections.CALENDARLIST)
          .insertOne(calListData);
        return response;
      } catch (e) {
        return new errors_base_1.BaseError(
          "Create Failed",
          JSON.stringify(e),
          status_codes_1.Status.INTERNAL_SERVER,
          true
        );
      }
    });
  }
}
exports.default = new CalendarService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsZW5kYXIuc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2JhY2tlbmQvc3JjL2NhbGVuZGFyL3NlcnZpY2VzL2NhbGVuZGFyLnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMERBQXFEO0FBQ3JELDREQUFtRDtBQUVuRCx1RUFBb0U7QUFDcEUsd0dBQWtFO0FBRWxFLE1BQU0sZUFBZTtJQUNiLE1BQU0sQ0FBQyxNQUFjLEVBQUUsWUFBaUM7O1lBQzVELE1BQU0sV0FBVyxHQUFHLFlBQVksQ0FBQztZQUNqQyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRTtnQkFDdEIsV0FBVyxDQUFDLElBQUksR0FBRyxNQUFNLENBQUM7YUFDM0I7WUFDRCxnQkFBZ0I7WUFDaEIsSUFBSTtnQkFDRixNQUFNLFFBQVEsR0FBRyxNQUFNLHVCQUFZLENBQUMsRUFBRTtxQkFDbkMsVUFBVSxDQUFDLHlCQUFXLENBQUMsWUFBWSxDQUFDO3FCQUNwQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBQzFCLE9BQU8sUUFBUSxDQUFDO2FBQ2pCO1lBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ1YsT0FBTyxJQUFJLHVCQUFTLENBQ2xCLGVBQWUsRUFDZixJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUNqQixxQkFBTSxDQUFDLGVBQWUsRUFDdEIsSUFBSSxDQUNMLENBQUM7YUFDSDtRQUNILENBQUM7S0FBQTtDQUNGO0FBRUQsa0JBQWUsSUFBSSxlQUFlLEVBQUUsQ0FBQyJ9
