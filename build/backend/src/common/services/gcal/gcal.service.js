"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const errors_base_1 = require("@core/errors/errors.base");
const status_codes_1 = require("@core/errors/status.codes");
const winston_logger_1 = require("@core/logger/winston.logger");
const backend_constants_1 = require("@backend/common/constants/backend.constants");
const logger = (0, winston_logger_1.Logger)("app:compass.gcal.service");
class GCalService {
  createEvent(gcal, event) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
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
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      try {
        const response = yield gcal.events.delete({
          calendarId: backend_constants_1.GCAL_PRIMARY,
          eventId: gcalEventId,
          sendUpdates: "all",
        });
      } catch (e) {
        if (e.response.status === 410) {
          // If the resource is `gone` [status code 410] just ignore
          logger.warn(
            `GCal Event was deleted before this request: ${gcalEventId}`
          );
        } else {
          return new errors_base_1.BaseError(
            "GCal Delete Failed",
            "Failed to delete event in gcal",
            status_codes_1.Status.BAD_REQUEST,
            true
          );
        }
      }
    });
  }
  getEvents(gcal, params) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      const response = yield gcal.events.list(params);
      return response;
    });
  }
  listCalendars(gcal) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      try {
        const response = yield gcal.calendarList.list();
        return response.data;
      } catch (e) {
        return new errors_base_1.BaseError(
          "GCal Calendar List Failed",
          e,
          status_codes_1.Status.UNSURE,
          true
        );
      }
    });
  }
  updateEvent(gcal, gEventId, event) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      try {
        const response = yield gcal.events.update({
          calendarId: backend_constants_1.GCAL_PRIMARY,
          eventId: gEventId,
          requestBody: event,
        });
        return response.data;
      } catch (e) {
        return new errors_base_1.BaseError(
          "GCal Update Failed",
          e,
          status_codes_1.Status.BAD_REQUEST,
          true
        );
      }
    });
  }
}
exports.default = new GCalService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2NhbC5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYmFja2VuZC9zcmMvY29tbW9uL3NlcnZpY2VzL2djYWwvZ2NhbC5zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLDBEQUFxRDtBQUNyRCw0REFBbUQ7QUFDbkQsZ0VBQXFEO0FBQ3JELG1GQUEyRTtBQUUzRSxNQUFNLE1BQU0sR0FBRyxJQUFBLHVCQUFNLEVBQUMsMEJBQTBCLENBQUMsQ0FBQztBQUVsRCxNQUFNLFdBQVc7SUFDVCxXQUFXLENBQUMsSUFBZSxFQUFFLEtBQW9COztZQUNyRCxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO2dCQUN4QyxVQUFVLEVBQUUsU0FBUztnQkFDckIsV0FBVyxFQUFFLEtBQUs7YUFDbkIsQ0FBQyxDQUFDO1lBRUgsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxXQUFXLEVBQUU7Z0JBQ3hDLE1BQU0sQ0FBQyxPQUFPLENBQUMsaUNBQWlDLENBQUMsQ0FBQzthQUNuRDtZQUVELE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQztRQUN2QixDQUFDO0tBQUE7SUFFSyxXQUFXLENBQ2YsSUFBZSxFQUNmLFdBQW1COztZQUVuQixJQUFJO2dCQUNGLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7b0JBQ3hDLFVBQVUsRUFBRSxnQ0FBWTtvQkFDeEIsT0FBTyxFQUFFLFdBQVc7b0JBQ3BCLFdBQVcsRUFBRSxLQUFLO2lCQUNuQixDQUFDLENBQUM7YUFDSjtZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNWLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssR0FBRyxFQUFFO29CQUM3QiwwREFBMEQ7b0JBQzFELE1BQU0sQ0FBQyxJQUFJLENBQ1QsK0NBQStDLFdBQVcsRUFBRSxDQUM3RCxDQUFDO2lCQUNIO3FCQUFNO29CQUNMLE9BQU8sSUFBSSx1QkFBUyxDQUNsQixvQkFBb0IsRUFDcEIsZ0NBQWdDLEVBQ2hDLHFCQUFNLENBQUMsV0FBVyxFQUNsQixJQUFJLENBQ0wsQ0FBQztpQkFDSDthQUNGO1FBQ0gsQ0FBQztLQUFBO0lBRUssU0FBUyxDQUFDLElBQWUsRUFBRSxNQUF5Qjs7WUFDeEQsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNoRCxPQUFPLFFBQVEsQ0FBQztRQUNsQixDQUFDO0tBQUE7SUFFSyxhQUFhLENBQUMsSUFBZTs7WUFDakMsSUFBSTtnQkFDRixNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ2hELE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQzthQUN0QjtZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNWLE9BQU8sSUFBSSx1QkFBUyxDQUFDLDJCQUEyQixFQUFFLENBQUMsRUFBRSxxQkFBTSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQzthQUMzRTtRQUNILENBQUM7S0FBQTtJQUVLLFdBQVcsQ0FBQyxJQUFlLEVBQUUsUUFBZ0IsRUFBRSxLQUFvQjs7WUFDdkUsSUFBSTtnQkFDRixNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO29CQUN4QyxVQUFVLEVBQUUsZ0NBQVk7b0JBQ3hCLE9BQU8sRUFBRSxRQUFRO29CQUNqQixXQUFXLEVBQUUsS0FBSztpQkFDbkIsQ0FBQyxDQUFDO2dCQUNILE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQzthQUN0QjtZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNWLE9BQU8sSUFBSSx1QkFBUyxDQUFDLG9CQUFvQixFQUFFLENBQUMsRUFBRSxxQkFBTSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQzthQUN6RTtRQUNILENBQUM7S0FBQTtDQUNGO0FBRUQsa0JBQWUsSUFBSSxXQUFXLEVBQUUsQ0FBQyJ9
