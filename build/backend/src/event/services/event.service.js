"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const map_event_1 = require("@core/mappers/map.event");
const errors_base_1 = require("@core/errors/errors.base");
const status_codes_1 = require("@core/errors/status.codes");
const gcal_service_1 = (0, tslib_1.__importDefault)(
  require("@backend/common/services/gcal/gcal.service")
);
const mongo_service_1 = (0, tslib_1.__importDefault)(
  require("@backend/common/services/mongo.service")
);
const backend_constants_1 = require("@backend/common/constants/backend.constants");
const winston_logger_1 = require("@core/logger/winston.logger");
const collections_1 = require("@backend/common/constants/collections");
const common_helpers_1 = require("@backend/common/helpers/common.helpers");
const google_auth_service_1 = require("@backend/auth/services/google.auth.service");
const core_constants_1 = require("@core/core.constants");
const event_service_helpers_1 = require("./event.service.helpers");
const logger = (0, winston_logger_1.Logger)("app:event.service");
class EventService {
  create(userId, event) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      try {
        /* Save to Gcal */
        const _gEvent = map_event_1.MapEvent.toGcal(event);
        const gEventWithOrigin = Object.assign(Object.assign({}, _gEvent), {
          // capture the fact that this event originated from Compass,
          // so we dont attempt to re-add it during the next gcal sync
          extendedProperties: {
            private: {
              origin: core_constants_1.Origin.Compass,
            },
          },
        });
        const gcal = yield (0, google_auth_service_1.getGcal)(userId);
        const gEvent = yield gcal_service_1.default.createEvent(
          gcal,
          gEventWithOrigin
        );
        /* Save to Compass */
        const eventWithGcalId = Object.assign(Object.assign({}, event), {
          user: userId,
          gEventId: gEvent.id,
        });
        const response = yield mongo_service_1.default.db
          .collection(collections_1.Collections.EVENT)
          .insertOne(eventWithGcalId);
        if ("acknowledged" in response) {
          const eventWithId = Object.assign(
            Object.assign({}, eventWithGcalId),
            { _id: response.insertedId.toString() }
          );
          return eventWithId;
        } else {
          return new errors_base_1.BaseError(
            "Create Failed",
            response.toString(),
            status_codes_1.Status.INTERNAL_SERVER,
            true
          );
        }
      } catch (e) {
        logger.error(e);
        return new errors_base_1.BaseError(
          "Create Failed",
          e.message,
          status_codes_1.Status.INTERNAL_SERVER,
          true
        );
      }
    });
  }
  createMany(userId, data) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      //TODO verify userId exists first (?)
      // TODO catch BulkWriteError
      const response = yield mongo_service_1.default.db
        .collection(collections_1.Collections.EVENT)
        .insertMany(data);
      if ("insertedCount" in response && response.insertedCount > 0) {
        return response;
      } else {
        return new errors_base_1.BaseError(
          "Create Failed",
          response.toString(),
          500,
          true
        );
      }
    });
  }
  /* Deletes all of a user's events */
  deleteAllByUser(userId) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      const response = yield mongo_service_1.default.db
        .collection(collections_1.Collections.EVENT)
        .deleteMany({ user: userId });
      return response;
    });
  }
  deleteById(userId, id) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      // TODO refactor this so it doesn't require so many calls
      try {
        const filter = {
          _id: mongo_service_1.default.objectId(id),
          user: userId,
        };
        //get event so you can see the googleId
        const event = yield mongo_service_1.default.db
          .collection(collections_1.Collections.EVENT)
          .findOne(filter);
        if (!event) {
          return new errors_base_1.BaseError(
            "Delete Failed",
            `Could not find event with id: ${id}`,
            status_codes_1.Status.BAD_REQUEST,
            true
          );
        }
        const { gEventId } = event;
        if (gEventId === undefined) {
          return new errors_base_1.BaseError(
            "Delete Failed",
            `GoogleEvent id cannot be null`,
            status_codes_1.Status.BAD_REQUEST,
            true
          );
        }
        const response = yield mongo_service_1.default.db
          .collection(collections_1.Collections.EVENT)
          .deleteOne(filter);
        const gcal = yield (0, google_auth_service_1.getGcal)(userId);
        // no await because gcal doesnt return much of a response,
        // so there's no use in waiting for it to finish
        gcal_service_1.default.deleteEvent(gcal, gEventId);
        return response;
      } catch (e) {
        logger.error(e);
        return new errors_base_1.BaseError(
          "Delete Failed!",
          e,
          status_codes_1.Status.INTERNAL_SERVER,
          true
        );
      }
    });
  }
  deleteMany(userId, params) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      const errors = [];
      try {
        const response = yield mongo_service_1.default.db
          .collection(collections_1.Collections.EVENT)
          .deleteMany({ user: userId, [params.key]: { $in: params.ids } });
        if (response.deletedCount !== params.ids.length) {
          errors.push(
            `Only deleted ${response.deletedCount}/${params.ids.length} events`
          );
        }
        const result = { deletedCount: response.deletedCount, errors: errors };
        return result;
      } catch (e) {
        logger.error(e);
        throw new errors_base_1.BaseError("DeleteMany Failed", e, 500, true);
      }
    });
  }
  import(userId, gcal) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      try {
        let nextPageToken = undefined;
        let nextSyncToken = undefined;
        let total = 0;
        const errors = [];
        const numYears = 2;
        logger.info(
          `Importing past ${numYears} years of GCal events for user: ${userId}`
        );
        const xYearsAgo = (0, common_helpers_1.yearsAgo)(numYears);
        // always fetches once, then continues until
        // there are no more events
        do {
          const params = {
            calendarId: backend_constants_1.GCAL_PRIMARY,
            timeMin: xYearsAgo,
            pageToken: nextPageToken,
          };
          const gEvents = yield gcal_service_1.default.getEvents(gcal, params);
          if (gEvents.data.items) total += gEvents.data.items.length;
          if (gEvents.data.items) {
            const cEvents = map_event_1.MapEvent.toCompass(
              userId,
              gEvents.data.items,
              core_constants_1.Origin.GoogleImport
            );
            const response = yield this.createMany(userId, cEvents);
            if (
              response.acknowledged &&
              response.insertedCount !== cEvents.length
            ) {
              errors.push(
                `Only ${response.insertedCount}/${cEvents.length} imported`
              );
            }
            nextPageToken = gEvents.data.nextPageToken;
            nextSyncToken = gEvents.data.nextSyncToken;
          } else {
            logger.error("unexpected empty values in events");
          }
        } while (nextPageToken !== undefined);
        const summary = {
          total: total,
          nextSyncToken: nextSyncToken,
          errors: errors,
        };
        return summary;
      } catch (e) {
        // TODO catch 401 error and start from the top
        // this shouldn't happen for a first-time import
        logger.error(e.message);
        const errorSummary = {
          total: -1,
          nextSyncToken: "unsure",
          errors: [e],
        };
        return errorSummary;
      }
    });
  }
  readAll(userId, query) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      try {
        const filter = (0, event_service_helpers_1.getReadAllFilter)(
          userId,
          query
        );
        const response = yield mongo_service_1.default.db
          .collection(collections_1.Collections.EVENT)
          .find(filter)
          .toArray();
        return response;
      } catch (e) {
        logger.error(e);
        return new errors_base_1.BaseError("Read Failed", e, 500, true);
      }
    });
  }
  readById(userId, eventId) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      try {
        const filter = {
          _id: mongo_service_1.default.objectId(eventId),
          user: userId,
        };
        const event = yield mongo_service_1.default.db
          .collection(collections_1.Collections.EVENT)
          .findOne(filter);
        if (event === null) {
          return new errors_base_1.BaseError(
            "Event not found",
            `Tried with user: ${userId} and _id: ${eventId}`,
            status_codes_1.Status.NOT_FOUND,
            true
          );
        }
        return event;
      } catch (e) {
        logger.error(e);
        return new errors_base_1.BaseError("Read Failed", e, 500, true);
      }
    });
  }
  updateById(userId, eventId, event) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      try {
        if ("_id" in event) {
          delete event._id; // mongo doesn't allow changing this field directly
        }
        const response = yield mongo_service_1.default.db
          .collection(collections_1.Collections.EVENT)
          .findOneAndUpdate(
            { _id: mongo_service_1.default.objectId(eventId), user: userId },
            { $set: event },
            { returnDocument: "after" }
          );
        if (response.value === null || response.idUpdates === 0) {
          logger.error("Update failed");
          return new errors_base_1.BaseError(
            "Update Failed",
            "Ensure id is correct",
            400,
            true
          );
        }
        const updatedEvent = response.value;
        const gEvent = map_event_1.MapEvent.toGcal(updatedEvent);
        const gcal = yield (0, google_auth_service_1.getGcal)(userId);
        const gEventId = updatedEvent.gEventId;
        if (gEventId === undefined) {
          return new errors_base_1.BaseError(
            "Update Failed",
            "no gEventId",
            status_codes_1.Status.INTERNAL_SERVER,
            true
          );
        }
        //TODO error-handle this and/or extract from this and turn into its own saga,
        // in order to remove extra work that delays response to user
        const gcalRes = yield gcal_service_1.default.updateEvent(
          gcal,
          gEventId,
          gEvent
        );
        return updatedEvent;
      } catch (e) {
        logger.error(e);
        return new errors_base_1.BaseError("Update Failed", e, 500, true);
      }
    });
  }
  updateMany(userId, events) {
    return (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
      return "not done implementing this operation";
    });
  }
}
exports.default = new EventService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQuc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2JhY2tlbmQvc3JjL2V2ZW50L3NlcnZpY2VzL2V2ZW50LnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBR0EsdURBQW1EO0FBQ25ELDBEQUFxRDtBQUNyRCw0REFBbUQ7QUFPbkQsMkdBQXFFO0FBQ3JFLHdHQUFrRTtBQUNsRSxtRkFBMkU7QUFDM0UsZ0VBQXFEO0FBQ3JELHVFQUFvRTtBQUNwRSwyRUFBa0U7QUFDbEUsb0ZBQXFFO0FBQ3JFLHlEQUE4QztBQUc5QyxtRUFBMkQ7QUFFM0QsTUFBTSxNQUFNLEdBQUcsSUFBQSx1QkFBTSxFQUFDLG1CQUFtQixDQUFDLENBQUM7QUFFM0MsTUFBTSxZQUFZO0lBQ1YsTUFBTSxDQUNWLE1BQWMsRUFDZCxLQUFtQjs7WUFFbkIsSUFBSTtnQkFDRixrQkFBa0I7Z0JBQ2xCLE1BQU0sT0FBTyxHQUFHLG9CQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUN2QyxNQUFNLGdCQUFnQixtQ0FDakIsT0FBTztvQkFDViw0REFBNEQ7b0JBQzVELDREQUE0RDtvQkFDNUQsa0JBQWtCLEVBQUU7d0JBQ2xCLE9BQU8sRUFBRTs0QkFDUCxNQUFNLEVBQUUsdUJBQU0sQ0FBQyxPQUFPO3lCQUN2QjtxQkFDRixHQUNGLENBQUM7Z0JBQ0YsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFBLDZCQUFPLEVBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ25DLE1BQU0sTUFBTSxHQUFHLE1BQU0sc0JBQVcsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLGdCQUFnQixDQUFDLENBQUM7Z0JBRXJFLHFCQUFxQjtnQkFDckIsTUFBTSxlQUFlLG1DQUNoQixLQUFLLEtBQ1IsSUFBSSxFQUFFLE1BQU0sRUFDWixRQUFRLEVBQUUsTUFBTSxDQUFDLEVBQUUsR0FDcEIsQ0FBQztnQkFFRixNQUFNLFFB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
