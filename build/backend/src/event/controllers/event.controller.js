"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const uuid_1 = require("uuid");
const backend_constants_1 = require("@backend/common/constants/backend.constants");
const collections_1 = require("@backend/common/constants/collections");
const mongo_service_1 = (0, tslib_1.__importDefault)(
  require("@backend/common/services/mongo.service")
);
const winston_logger_1 = require("@core/logger/winston.logger");
const google_auth_service_1 = require("@backend/auth/services/google.auth.service");
const sync_service_1 = (0, tslib_1.__importDefault)(
  require("@backend/sync/services/sync.service")
);
const event_service_1 = (0, tslib_1.__importDefault)(
  require("@backend/event/services/event.service")
);
const logger = (0, winston_logger_1.Logger)("app:event.controller");
class EventController {
  constructor() {
    this.create = (req, res) =>
      (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const userId = res.locals.user.id;
        if (req.body instanceof Array) {
          const response = yield event_service_1.default.createMany(
            userId,
            req.body
          );
          //@ts-ignore
          res.promise(Promise.resolve(response));
        } else {
          const response = yield event_service_1.default.create(
            userId,
            req.body
          );
          //@ts-ignore
          res.promise(Promise.resolve(response));
        }
      });
    this.delete = (req, res) =>
      (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const userId = res.locals.user.id;
        //@ts-ignore
        const eventId = req.params.id;
        const deleteResponse = yield event_service_1.default.deleteById(
          userId,
          eventId
        );
        //@ts-ignore
        res.promise(Promise.resolve(deleteResponse));
      });
    this.deleteMany = (
      // req: ReqBody<{ key: string; ids: string[] }>,
      req,
      res
    ) =>
      (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const userId = res.locals.user.id;
        //TODO validate body
        const deleteResponse = yield event_service_1.default.deleteMany(
          userId,
          req.body
        );
        //@ts-ignore
        res.promise(Promise.resolve(deleteResponse));
      });
    this.import = (req, res) =>
      (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        try {
          const userId = res.locals.user.id;
          const userExists = yield mongo_service_1.default.recordExists(
            collections_1.Collections.USER,
            {
              _id: mongo_service_1.default.objectId(userId),
            }
          );
          if (userExists) {
            //@ts-ignore
            logger.debug(
              `Deleting events for clean import for user: ${userId}`
            );
            yield event_service_1.default.deleteAllByUser(userId);
          }
          const gcal = yield (0, google_auth_service_1.getGcal)(userId);
          const importEventsResult = yield event_service_1.default.import(
            userId,
            gcal
          );
          const syncTokenUpdateResult =
            yield sync_service_1.default.updateNextSyncToken(
              userId,
              importEventsResult.nextSyncToken
            );
          // TODO remove 'primary-' after supporting multiple channels/user
          const channelId = `primary-${(0, uuid_1.v4)()}`;
          const watchResult = yield sync_service_1.default.startWatchingChannel(
            gcal,
            userId,
            backend_constants_1.GCAL_PRIMARY,
            channelId
          );
          const syncUpdate = yield sync_service_1.default.updateSyncData(
            userId,
            channelId,
            watchResult.resourceId,
            watchResult.expiration
          );
          const syncUpdateSummary =
            //@ts-ignore
            syncUpdate.ok === 1 && syncUpdate.lastErrorObject.updatedExisting
              ? "success"
              : "failed";
          const fullResults = {
            events: importEventsResult,
            sync: {
              watch: watchResult,
              nextSyncToken: syncTokenUpdateResult,
              syncDataUpdate: syncUpdateSummary,
            },
          };
          //@ts-ignore
          res.promise(Promise.resolve(fullResults));
        } catch (e) {
          //@ts-ignore
          res.promise(Promise.reject(e));
        }
      });
    this.readById = (req, res) =>
      (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const userId = res.locals.user.id;
        //@ts-ignore
        const eventId = req.params.id;
        const response = yield event_service_1.default.readById(
          userId,
          eventId
        );
        res.promise(Promise.resolve(response));
      });
    this.readAll = (req, res) =>
      (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const userId = res.locals.user.id;
        const usersEvents = yield event_service_1.default.readAll(
          userId,
          req.query
        );
        //@ts-ignore
        res.promise(Promise.resolve(usersEvents));
      });
    this.update = (req, res) =>
      (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        /*
            TODO validate:
             - that no id in body (cuz id is immutable and will cause mongo err if not removed)
            */
        const userId = res.locals.user.id;
        const event = req.body;
        //@ts-ignore
        const eventId = req.params.id;
        const response = yield event_service_1.default.updateById(
          userId,
          eventId,
          event
        );
        //@ts-ignore
        res.promise(Promise.resolve(response));
      });
    this.updateMany = (req, res) =>
      (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        try {
          const userId = res.locals.user.id;
          const events = req.body;
          const response = yield event_service_1.default.updateMany(
            userId,
            events
          );
          //@ts-ignore
          res.promise(Promise.resolve(response));
        } catch (e) {
          //@ts-ignore
          res.promise(Promise.reject(e));
        }
      });
  }
}
exports.default = new EventController();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQuY29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2JhY2tlbmQvc3JjL2V2ZW50L2NvbnRyb2xsZXJzL2V2ZW50LmNvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsK0JBQW9DO0FBRXBDLG1GQUEyRTtBQUUzRSx1RUFBb0U7QUFDcEUsd0dBQWtFO0FBQ2xFLGdFQUFxRDtBQUNyRCxvRkFBcUU7QUFDckUsb0dBQThEO0FBQzlELHVHQUFpRTtBQUVqRSxNQUFNLE1BQU0sR0FBRyxJQUFBLHVCQUFNLEVBQUMsc0JBQXNCLENBQUMsQ0FBQztBQUM5QyxNQUFNLGVBQWU7SUFBckI7UUFDRSxXQUFNLEdBQUcsQ0FBTyxHQUEwQixFQUFFLEdBQVEsRUFBRSxFQUFFO1lBQ3RELE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUVsQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLFlBQVksS0FBSyxFQUFFO2dCQUM3QixNQUFNLFFBQVEsR0FBRyxNQUFNLHVCQUFZLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2pFLFlBQVk7Z0JBQ1osR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7YUFDeEM7aUJBQU07Z0JBQ0wsTUFBTSxRQUFRLEdBQUcsTUFBTSx1QkFBWSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUM3RCxZQUFZO2dCQUNaLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2FBQ3hDO1FBQ0gsQ0FBQyxDQUFBLENBQUM7UUFFRixXQUFNLEdBQUcsQ0FBTyxHQUFvQixFQUFFLEdBQVEsRUFBRSxF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
