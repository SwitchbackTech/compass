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
const map_event_1 = require("@core/mappers/map.event");
const errors_base_1 = require("@core/errors/errors.base");
const status_codes_1 = require("@core/errors/status.codes");
const backend_constants_1 = require("@backend/common/constants/backend.constants");
const mongo_service_1 = __importDefault(require("@backend/common/services/mongo.service"));
const common_logger_1 = require("@backend/common/logger/common.logger");
const collections_1 = require("@backend/common/constants/collections");
const gcal_service_1 = __importDefault(require("@backend/common/services/gcal/gcal.service"));
const common_helpers_1 = require("@backend/common/helpers/common.helpers");
const google_auth_service_1 = require("@backend/auth/services/google.auth.service");
const event_service_helpers_1 = require("./event.service.helpers");
const logger = common_logger_1.Logger("app:event.service");
class EventService {
    create(userId, event) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const gcal = yield google_auth_service_1.getGcal(userId);
                const _gEvent = map_event_1.MapEvent.toGcal(userId, event);
                const gEvent = yield gcal_service_1.default.createEvent(gcal, _gEvent);
                const eventWithGcalId = Object.assign(Object.assign({}, event), { user: userId, gEventId: gEvent.id });
                const response = yield mongo_service_1.default.db
                    .collection(collections_1.Collections.EVENT)
                    .insertOne(eventWithGcalId);
                if ("acknowledged" in response) {
                    const eventWithId = Object.assign(Object.assign({}, eventWithGcalId), { _id: response.insertedId.toString() });
                    return eventWithId;
                }
                else {
                    return new errors_base_1.BaseError("Create Failed", response.toString(), 500, true);
                }
            }
            catch (e) {
                // TODO catch BulkWriteError
                logger.error(e);
                return new errors_base_1.BaseError("Create Failed", e.message, 500, true);
            }
        });
    }
    createMany(userId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            //TODO verify userId exists first (?)
            const response = yield mongo_service_1.default.db
                .collection(collections_1.Collections.EVENT)
                .insertMany(data);
            if ("insertedCount" in response && response.insertedCount > 0) {
                return response;
            }
            else {
                return new errors_base_1.BaseError("Create Failed", response.toString(), 500, true);
            }
        });
    }
    /* Deletes all of a user's events */
    deleteAllByUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield mongo_service_1.default.db
                .collection(collections_1.Collections.EVENT)
                .deleteMany({ user: userId });
            return response;
        });
    }
    deleteById(userId, id) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO refactor this so it doesn't require so many calls
            try {
                const filter = { _id: mongo_service_1.default.objectId(id), user: userId };
                //get event so you can see the googleId
                const event = yield mongo_service_1.default.db
                    .collection(collections_1.Collections.EVENT)
                    .findOne(filter);
                if (!event) {
                    return new errors_base_1.BaseError("Delete Failed", `Could not find eventt with id: ${id}`, status_codes_1.Status.BAD_REQUEST, true);
                }
                const { gEventId } = event;
                if (gEventId === undefined) {
                    return new errors_base_1.BaseError("Delete Failed", `GoogleEvent id cannot be null`, status_codes_1.Status.BAD_REQUEST, true);
                }
                const response = yield mongo_service_1.default.db
                    .collection(collections_1.Collections.EVENT)
                    .deleteOne(filter);
                const gcal = yield google_auth_service_1.getGcal(userId);
                // no await because gcal doesnt return much of a response,
                // so there's no use in waiting for it to finish
                gcal_service_1.default.deleteEvent(gcal, gEventId);
                return response;
            }
            catch (e) {
                logger.error(e);
                return new errors_base_1.BaseError("Delete Failed!", e, status_codes_1.Status.INTERNAL_SERVER, true);
            }
        });
    }
    deleteMany(userId, params) {
        return __awaiter(this, void 0, void 0, function* () {
            const errors = [];
            try {
                const response = yield mongo_service_1.default.db
                    .collection(collections_1.Collections.EVENT)
                    .deleteMany({ user: userId, [params.key]: { $in: params.ids } });
                if (response.deletedCount !== params.ids.length) {
                    errors.push(`Only deleted ${response.deletedCount}/${params.ids.length} events`);
                }
                const result = { deletedCount: response.deletedCount, errors: errors };
                return result;
            }
            catch (e) {
                logger.error(e);
                throw new errors_base_1.BaseError("DeleteMany Failed", e, 500, true);
            }
        });
    }
    import(userId, gcal) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let nextPageToken = undefined;
                let nextSyncToken = undefined;
                let total = 0;
                // always fetches once, then continues until
                // there are no more events
                logger.info(`Importing Google events for user: ${userId}`);
                const twoYearsAgo = common_helpers_1.yearsAgo(2);
                do {
                    const params = {
                        calendarId: backend_constants_1.GCAL_PRIMARY,
                        timeMin: twoYearsAgo,
                        pageToken: nextPageToken,
                    };
                    const gEvents = yield gcal_service_1.default.getEvents(gcal, params);
                    if (gEvents.data.items)
                        total += gEvents.data.items.length;
                    if (gEvents.data.items) {
                        const cEvents = map_event_1.MapEvent.toCompass(userId, gEvents.data.items);
                        const response = yield this.createMany(userId, cEvents);
                        //confirm acknowledged and that insertedCount = gEvents.legnth
                        nextPageToken = gEvents.data.nextPageToken;
                        nextSyncToken = gEvents.data.nextSyncToken;
                    }
                    else {
                        logger.error("unexpected empty values in events");
                    }
                } while (nextPageToken !== undefined);
                const summary = {
                    total: total,
                    nextSyncToken: nextSyncToken,
                    errors: [],
                };
                return summary;
            }
            catch (e) {
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
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const filter = event_service_helpers_1.getReadAllFilter(userId, query);
                const response = yield mongo_service_1.default.db
                    .collection(collections_1.Collections.EVENT)
                    .find(filter)
                    .toArray();
                return response;
            }
            catch (e) {
                logger.error(e);
                return new errors_base_1.BaseError("Read Failed", e, 500, true);
            }
        });
    }
    readById(userId, eventId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const filter = {
                    _id: mongo_service_1.default.objectId(eventId),
                    user: userId,
                };
                const event = yield mongo_service_1.default.db
                    .collection(collections_1.Collections.EVENT)
                    .findOne(filter);
                if (event === null) {
                    return new errors_base_1.BaseError("Event not found", `Tried with user: ${userId} and _id: ${eventId}`, status_codes_1.Status.NOT_FOUND, true);
                }
                return event;
            }
            catch (e) {
                logger.error(e);
                return new errors_base_1.BaseError("Read Failed", e, 500, true);
            }
        });
    }
    updateById(userId, eventId, event) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if ("_id" in event) {
                    delete event._id; // mongo doesn't allow changing this field directly
                }
                const response = yield mongo_service_1.default.db
                    .collection(collections_1.Collections.EVENT)
                    .findOneAndUpdate({ _id: mongo_service_1.default.objectId(eventId), user: userId }, { $set: event }, { returnDocument: "after" });
                if (response.value === null || response.idUpdates === 0) {
                    logger.error("Update failed");
                    return new errors_base_1.BaseError("Update Failed", "Ensure id is correct", 400, true);
                }
                const updatedEvent = response.value;
                const gEvent = map_event_1.MapEvent.toGcal(userId, updatedEvent);
                const gcal = yield google_auth_service_1.getGcal(userId);
                const gEventId = updatedEvent.gEventId;
                if (gEventId === undefined) {
                    return new errors_base_1.BaseError("Update Failed", "no gEventId", status_codes_1.Status.INTERNAL_SERVER, true);
                }
                //TODO error-handle this and/or extract from this and turn into its own saga,
                // in order to remove extra work that delays response to user
                const gcalRes = yield gcal_service_1.default.updateEvent(gcal, gEventId, gEvent);
                return updatedEvent;
            }
            catch (e) {
                logger.error(e);
                return new errors_base_1.BaseError("Update Failed", e, 500, true);
            }
        });
    }
    updateMany(userId, events) {
        return __awaiter(this, void 0, void 0, function* () {
            return "not done implementing this operation";
            const testId = `events.$[_id]`;
            const updateResult = mongo_service_1.default.db
                .collection(collections_1.Collections.EVENT)
                .updateMany(
            // { user: userId, _id: mongoService.objectId("cEvents.$[_id]") },
            { user: userId, _id: mongo_service_1.default.objectId(`events.${[_id]}`) }, 
            // { user: "testUser1", gEventId: "events.$[gEventId]" },
            { $set: events }, { upsert: true });
            return updateResult;
        });
    }
}
exports.default = new EventService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQuc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9ldmVudC9zZXJ2aWNlcy9ldmVudC5zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBR0EsdURBQW1EO0FBQ25ELDBEQUFxRDtBQUNyRCw0REFBbUQ7QUFRbkQsbUZBQTJFO0FBQzNFLDJGQUFrRTtBQUNsRSx3RUFBOEQ7QUFDOUQsdUVBQW9FO0FBQ3BFLDhGQUFxRTtBQUNyRSwyRUFBa0U7QUFDbEUsb0ZBQXFFO0FBR3JFLG1FQUEyRDtBQUUzRCxNQUFNLE1BQU0sR0FBRyxzQkFBTSxDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFFM0MsTUFBTSxZQUFZO0lBQ1YsTUFBTSxDQUNWLE1BQWMsRUFDZCxLQUFtQjs7WUFFbkIsSUFBSTtnQkFDRixNQUFNLElBQUksR0FBRyxNQUFNLDZCQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ25DLE1BQU0sT0FBTyxHQUFHLG9CQUFRLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDL0MsTUFBTSxNQUFNLEdBQUcsTUFBTSxzQkFBVyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBRTVELE1BQU0sZUFBZSxtQ0FDaEIsS0FBSyxLQUNSLElBQUksRUFBRSxNQUFNLEVBQ1osUUFBUSxFQUFFLE1BQU0sQ0FBQyxFQUFFLEdBQ3BCLENBQUM7Z0JBRUYsTUFBTSxRQUFRLEdBQUcsTUFBTSx1QkFBWSxDQUFDLEVBQUU7cUJBQ25DLFVBQVUsQ0FBQyx5QkFBVyxDQUFDLEtBQUssQ0FBQztxQkFDN0IsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUU5QixJQUFJLGNBQWMsSUFBSSxRQUFRLEVBQUU7b0JBQzlCLE1BQU0sV0FBVyxtQ0FDWixlQUFlLEtBQ2xCLEdBQUcsRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLFFB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