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
const status_codes_1 = require("@core/errors/status.codes");
const collections_1 = require("@backend/common/constants/collections");
const common_logger_1 = require("@backend/common/logger/common.logger");
const mongo_service_1 = __importDefault(require("@backend/common/services/mongo.service"));
const logger = common_logger_1.Logger("app:calendar.service");
class CalendarService {
    create(userId, calendarList) {
        return __awaiter(this, void 0, void 0, function* () {
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
            }
            catch (e) {
                return new errors_base_1.BaseError("Create Failed", e, status_codes_1.Status.INTERNAL_SERVER, true);
            }
        });
    }
}
exports.default = new CalendarService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsZW5kYXIuc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9jYWxlbmRhci9zZXJ2aWNlcy9jYWxlbmRhci5zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMERBQXFEO0FBQ3JELDREQUFtRDtBQUduRCx1RUFBb0U7QUFDcEUsd0VBQThEO0FBQzlELDJGQUFrRTtBQUVsRSxNQUFNLE1BQU0sR0FBRyxzQkFBTSxDQUFDLHNCQUFzQixDQUFDLENBQUM7QUFFOUMsTUFBTSxlQUFlO0lBQ2IsTUFBTSxDQUFDLE1BQWMsRUFBRSxZQUFpQzs7WUFDNUQsTUFBTSxXQUFXLEdBQUcsWUFBWSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFO2dCQUN0QixXQUFXLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQzthQUMzQjtZQUNELGdCQUFnQjtZQUNoQixJQUFJO2dCQUNGLE1BQU0sUUFBUSxHQUFHLE1BQU0sdUJBQVksQ0FBQyxFQUFFO3FCQUNuQyxVQUFVLENBQUMseUJBQVcsQ0FBQyxZQUFZLENBQUM7cUJBQ3BDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDMUIsT0FBTyxRQUFRLENBQUM7YUFDakI7WUFBQyxPQUFPLENBQUMsRUFBRTtnQkFDVixPQUFPLElBQUksdUJBQVMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxFQUFFLHFCQUFNLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQ3hFO1FBQ0gsQ0FBQztLQUFBO0NBQ0Y7QUFFRCxrQkFBZSxJQUFJLGVBQWUsRUFBRSxDQUFDIn0=