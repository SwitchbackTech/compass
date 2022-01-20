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
const errors_base_1 = require("@core/errors/errors.base");
const status_codes_1 = require("@core/errors/status.codes");
const common_logger_1 = require("@backend/common/logger/common.logger");
const backend_constants_1 = require("@backend/common/constants/backend.constants");
const logger = common_logger_1.Logger("app:compass.gcal.service");
class GCalService {
    createEvent(gcal, event) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield gcal.events.insert({
                calendarId: "primary",
                requestBody: event,
            });
            if (response.data.status !== "confirmed") {
                logger.warning("The gcal event might be invalid");
            }
            return response.data;
        });
    }
    deleteEvent(gcal, gcalEventId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield gcal.events.delete({
                    calendarId: backend_constants_1.GCAL_PRIMARY,
                    eventId: gcalEventId,
                    sendUpdates: "all",
                });
            }
            catch (e) {
                if (e.response.status === 410) {
                    // If the resource is `gone` [status code 410] just ignore
                    logger.warn(`GCal Event was deleted before this request: ${gcalEventId}`);
                }
                else {
                    return new errors_base_1.BaseError("GCal Delete Failed", "Failed to delete event in gcal", status_codes_1.Status.BAD_REQUEST, true);
                }
            }
        });
    }
    getEvents(gcal, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield gcal.events.list(params);
            return response;
        });
    }
    listCalendars(gcal) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield gcal.calendarList.list();
                return response.data;
            }
            catch (e) {
                return new errors_base_1.BaseError("GCal Calendar List Failed", e, status_codes_1.Status.UNSURE, true);
            }
        });
    }
    updateEvent(gcal, gEventId, event) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield gcal.events.update({
                    calendarId: backend_constants_1.GCAL_PRIMARY,
                    eventId: gEventId,
                    requestBody: event,
                });
                return response.data;
            }
            catch (e) {
                return new errors_base_1.BaseError("GCal Update Failed", e, status_codes_1.Status.BAD_REQUEST, true);
            }
        });
    }
}
exports.default = new GCalService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2NhbC5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2NvbW1vbi9zZXJ2aWNlcy9nY2FsL2djYWwuc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUVBLDBEQUFxRDtBQUNyRCw0REFBbUQ7QUFFbkQsd0VBQThEO0FBQzlELG1GQUEyRTtBQUUzRSxNQUFNLE1BQU0sR0FBRyxzQkFBTSxDQUFDLDBCQUEwQixDQUFDLENBQUM7QUFFbEQsTUFBTSxXQUFXO0lBQ1QsV0FBVyxDQUFDLElBQWUsRUFBRSxLQUFvQjs7WUFDckQsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztnQkFDeEMsVUFBVSxFQUFFLFNBQVM7Z0JBQ3JCLFdBQVcsRUFBRSxLQUFLO2FBQ25CLENBQUMsQ0FBQztZQUVILElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssV0FBVyxFQUFFO2dCQUN4QyxNQUFNLENBQUMsT0FBTyxDQUFDLGlDQUFpQyxDQUFDLENBQUM7YUFDbkQ7WUFFRCxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUM7UUFDdkIsQ0FBQztLQUFBO0lBRUssV0FBVyxDQUNmLElBQWUsRUFDZixXQUFtQjs7WUFFbkIsSUFBSTtnQkFDRixNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO29CQUN4QyxVQUFVLEVBQUUsZ0NBQVk7b0JBQ3hCLE9BQU8sRUFBRSxXQUFXO29CQUNwQixXQUFXLEVBQUUsS0FBSztpQkFDbkIsQ0FBQyxDQUFDO2FBQ0o7WUFBQyxPQUFPLENBQUMsRUFBRTtnQkFDVixJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLEdBQUcsRUFBRTtvQkFDN0IsMERBQTBEO29CQUMxRCxNQUFNLENBQUMsSUFBSSxDQUNULCtDQUErQyxXQUFXLEVBQUUsQ0FDN0QsQ0FBQztpQkFDSDtxQkFBTTtvQkFDTCxPQUFPLElBQUksdUJBQVMsQ0FDbEIsb0JBQW9CLEVBQ3BCLGdDQUFnQyxFQUNoQyxxQkFBTSxDQUFDLFdBQVcsRUFDbEIsSUFBSSxDQUNMLENBQUM7aUJBQ0g7YUFDRjtRQUNILENBQUM7S0FBQTtJQUVLLFNBQVMsQ0FBQyxJQUFlLEVBQUUsTUFBeUI7O1lBQ3hELE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDaEQsT0FBTyxRQUFRLENBQUM7UUFDbEIsQ0FBQztLQUFBO0lBRUssYUFBYSxDQUFDLElBQWU7O1lBQ2pDLElBQUk7Z0JBQ0YsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNoRCxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUM7YUFDdEI7WUFBQyxPQUFPLENBQUMsRUFBRTtnQkFDVixPQUFPLElBQUksdUJBQVMsQ0FBQywyQkFBMkIsRUFBRSxDQUFDLEVBQUUscUJBQU0sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7YUFDM0U7UUFDSCxDQUFDO0tBQUE7SUFFSyxXQUFXLENBQUMsSUFBZSxFQUFFLFFBQWdCLEVBQUUsS0FBb0I7O1lBQ3ZFLElBQUk7Z0JBQ0YsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztvQkFDeEMsVUFBVSxFQUFFLGdDQUFZO29CQUN4QixPQUFPLEVBQUUsUUFBUTtvQkFDakIsV0FBVyxFQUFFLEtBQUs7aUJBQ25CLENBQUMsQ0FBQztnQkFDSCxPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUM7YUFDdEI7WUFBQyxPQUFPLENBQUMsRUFBRTtnQkFDVixPQUFPLElBQUksdUJBQVMsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLEVBQUUscUJBQU0sQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUM7YUFDekU7UUFDSCxDQUFDO0tBQUE7Q0FDRjtBQUVELGtCQUFlLElBQUksV0FBVyxFQUFFLENBQUMifQ==