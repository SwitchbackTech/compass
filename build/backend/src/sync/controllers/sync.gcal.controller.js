"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const winston_logger_1 = require("@core/logger/winston.logger");
const google_auth_service_1 = require("@backend/auth/services/google.auth.service");
const errors_base_1 = require("@core/errors/errors.base");
const status_codes_1 = require("@core/errors/status.codes");
const sync_service_1 = (0, tslib_1.__importDefault)(
  require("../services/sync.service")
);
const sync_helpers_1 = require("../services/sync.helpers");
const logger = (0, winston_logger_1.Logger)("app:sync.gcal");
class GcalSyncController {
  constructor() {
    this.handleNotification = (req, res) =>
      (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        if ((0, sync_helpers_1.hasExpectedHeaders)(req.headers)) {
          const params = {
            channelId: req.headers["x-goog-channel-id"],
            resourceId: req.headers["x-goog-resource-id"],
            resourceState: req.headers["x-goog-resource-state"],
            expiration: req.headers["x-goog-channel-expiration"],
          };
          const notifResponse =
            yield sync_service_1.default.handleGcalNotification(params);
          // @ts-ignore
          res.promise(Promise.resolve(notifResponse));
        } else {
          const msg = `Notification request has invalid headers:\n${JSON.stringify(
            req.headers
          )}`;
          logger.error(msg);
          const err = new errors_base_1.BaseError(
            "Bad Headers",
            msg,
            status_codes_1.Status.BAD_REQUEST,
            true
          );
          // @ts-ignore
          res.promise(Promise.resolve(err));
        }
      });
    this.startWatching = (req, res) =>
      (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        try {
          const userId = res.locals.user.id;
          const calendarId = req.body.calendarId;
          const channelId = req.body.channelId;
          const gcal = yield (0, google_auth_service_1.getGcal)(userId);
          const watchResult = yield sync_service_1.default.startWatchingChannel(
            gcal,
            userId,
            calendarId,
            channelId
          );
          // @ts-ignore
          res.promise(Promise.resolve(watchResult));
        } catch (e) {
          // @ts-ignore
          res.promise(Promise.reject(e));
        }
      });
    this.stopWatching = (req, res) =>
      (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        try {
          const userId = res.locals.user.id;
          const channelId = req.body.channelId;
          const resourceId = req.body.resourceId;
          const stopResult = yield sync_service_1.default.stopWatchingChannel(
            userId,
            channelId,
            resourceId
          );
          // @ts-ignore
          res.promise(Promise.resolve(stopResult));
        } catch (e) {
          // @ts-ignore
          res.promise(Promise.reject(e));
        }
      });
  }
}
exports.default = new GcalSyncController();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3luYy5nY2FsLmNvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9iYWNrZW5kL3NyYy9zeW5jL2NvbnRyb2xsZXJzL3N5bmMuZ2NhbC5jb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQU9BLGdFQUFxRDtBQUNyRCxvRkFBcUU7QUFDckUsMERBQXFEO0FBQ3JELDREQUFtRDtBQUVuRCx5RkFBbUQ7QUFDbkQsMkRBQThEO0FBRTlELE1BQU0sTUFBTSxHQUFHLElBQUEsdUJBQU0sRUFBQyxlQUFlLENBQUMsQ0FBQztBQUN2QyxNQUFNLGtCQUFrQjtJQUF4QjtRQUNFLHVCQUFrQixHQUFHLENBQU8sR0FBb0IsRUFBRSxHQUFxQixFQUFFLEVBQUU7WUFDekUsSUFBSSxJQUFBLGlDQUFrQixFQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDbkMsTUFBTSxNQUFNLEdBQUc7b0JBQ2IsU0FBUyxFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUM7b0JBQzNDLFVBQVUsRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDO29CQUM3QyxhQUFhLEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQztvQkFDbkQsVUFBVSxFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsMkJBQTJCLENBQUM7aUJBQ2hDLENBQUM7Z0JBRXZCLE1BQU0sYUFBYSxHQUFHLE1BQU0sc0JBQVcsQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFFdkUsYUFBYTtnQkFDYixHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQzthQUM3QztpQkFBTTtnQkFDTCxNQUFNLEdBQUcsR0FBRyw4Q0FBOEMsSUFBSSxDQUFDLFNBQVMsQ0FDdEUsR0FBRyxDQUFDLE9BQU8sQ0FDWixFQUFFLENBQUM7Z0JBQ0osTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDbEIsTUFBTSxHQUFHLEdBQUcsSUFBSSx1QkFBUyxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUUscUJBQU0sQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3hFLGFBQWE7Z0JBQ2IsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7YUFDbkM7UUFDSCxDQUFDLENBQUEsQ0FBQztRQUVGLGtCQUFhLEdBQUcsQ0FBTyxHQUFtQyxFQUFFLEdBQVEsRUFBRSxFQUFFO1lBQ3RFLElBQUk7Z0JBQ0YsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNsQyxNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQztnQkFDdkMsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBRXJDLE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBQSw2QkFBTyxFQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNuQyxNQUFNLFdBQVcsR0FBRyxNQUFNLHNCQUFXLENBQUMsb0JBQW9CLENBQ3hELElBQUksRUFDSixNQUFNLEVBQ04sVUFBVSxFQUNWLFNBQVMsQ0FDVixDQUFDO2dCQUVGLGFBQWE7Z0JBQ2IsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7YUFDM0M7WUFBQyxPQUFPLENBQUMsRUFBRTtnQkFDVixhQUFhO2dCQUNiLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ2hDO1FBQ0gsQ0FBQyxDQUFBLENBQUM7UUFFRixpQkFBWSxHQUFHLENBQU8sR0FBa0MsRUFBRSxHQUFRLEVBQUUsRUFBRTtZQUNwRSxJQUFJO2dCQUNGLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDbEMsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ3JDLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO2dCQUV2QyxNQUFNLFVBQVUsR0FBRyxNQUFNLHNCQUFXLENBQUMsbUJBQW1CLENBQ3RELE1BQU0sRUFDTixTQUFTLEVBQ1QsVUFBVSxDQUNYLENBQUM7Z0JBQ0YsYUFBYTtnQkFDYixHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQzthQUMxQztZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNWLGFBQWE7Z0JBQ2IsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDaEM7UUFDSCxDQUFDLENBQUEsQ0FBQztJQUNKLENBQUM7Q0FBQTtBQUVELGtCQUFlLElBQUksa0JBQWtCLEVBQUUsQ0FBQyJ9
