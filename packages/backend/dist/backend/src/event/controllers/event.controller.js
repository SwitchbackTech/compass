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
const uuid_1 = require("uuid");
const backend_constants_1 = require("@backend/common/constants/backend.constants");
const collections_1 = require("@backend/common/constants/collections");
const mongo_service_1 = __importDefault(require("@backend/common/services/mongo.service"));
const common_logger_1 = require("@backend/common/logger/common.logger");
const google_auth_service_1 = require("@backend/auth/services/google.auth.service");
const sync_service_1 = __importDefault(require("@backend/sync/services/sync.service"));
const sync_helpers_1 = require("@backend/sync/services/sync.helpers");
const event_service_1 = __importDefault(require("@backend/event/services/event.service"));
const logger = common_logger_1.Logger("app:event.controller");
class EventController {
    constructor() {
        this.create = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const userId = res.locals.user.id;
            if (req.body instanceof Array) {
                const response = yield event_service_1.default.createMany(userId, req.body);
                res.promise(Promise.resolve(response));
            }
            else {
                const response = yield event_service_1.default.create(userId, req.body);
                res.promise(Promise.resolve(response));
            }
        });
        this.delete = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const userId = res.locals.user.id;
            const eventId = req.params.id;
            const deleteResponse = yield event_service_1.default.deleteById(userId, eventId);
            res.promise(Promise.resolve(deleteResponse));
        });
        this.deleteMany = (
        // req: ReqBody<{ key: string; ids: string[] }>,
        req, res) => __awaiter(this, void 0, void 0, function* () {
            const userId = res.locals.user.id;
            //TODO validate body
            const deleteResponse = yield event_service_1.default.deleteMany(userId, req.body);
            res.promise(Promise.resolve(deleteResponse));
        });
        this.import = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = res.locals.user.id;
                const userExists = yield mongo_service_1.default.recordExists(collections_1.Collections.USER, {
                    _id: mongo_service_1.default.objectId(userId),
                });
                if (userExists) {
                    logger.debug(`Deleting events for clean import for user: ${userId}`);
                    yield event_service_1.default.deleteAllByUser(userId);
                }
                const gcal = yield google_auth_service_1.getGcal(userId);
                const importEventsResult = yield event_service_1.default.import(userId, gcal);
                const syncTokenUpdateResult = yield sync_helpers_1.updateNextSyncToken(userId, importEventsResult.nextSyncToken);
                // TODO remove 'primary-' after supporting multiple channels/user
                const channelId = `primary-${uuid_1.v4()}`;
                const watchResult = yield sync_service_1.default.startWatchingChannel(gcal, backend_constants_1.GCAL_PRIMARY, channelId);
                const syncUpdate = yield sync_helpers_1.updateSyncData(userId, channelId, watchResult.resourceId, watchResult.expiration);
                const syncUpdateSummary = syncUpdate.ok === 1 && syncUpdate.lastErrorObject.updatedExisting
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
                res.promise(Promise.resolve(fullResults));
            }
            catch (e) {
                res.promise(Promise.reject(e));
            }
        });
        this.readById = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const userId = res.locals.user.id;
            const eventId = req.params.id;
            const response = yield event_service_1.default.readById(userId, eventId);
            res.promise(Promise.resolve(response));
        });
        this.readAll = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const userId = res.locals.user.id;
            const usersEvents = yield event_service_1.default.readAll(userId, req.query);
            res.promise(Promise.resolve(usersEvents));
        });
        this.update = (req, res) => __awaiter(this, void 0, void 0, function* () {
            /*
            TODO validate:
             - that no id in body (cuz id is immutable and will cause mongo err)
            */
            const userId = res.locals.user.id;
            const event = req.body;
            const eventId = req.params.id;
            const response = yield event_service_1.default.updateById(userId, eventId, event);
            res.promise(Promise.resolve(response));
        });
        this.updateMany = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = res.locals.user.id;
                const events = req.body;
                const response = yield event_service_1.default.updateMany(userId, events);
                res.promise(Promise.resolve(response));
            }
            catch (e) {
                res.promise(Promise.reject(e));
            }
        });
    }
}
exports.default = new EventController();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQuY29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9ldmVudC9jb250cm9sbGVycy9ldmVudC5jb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsK0JBQW9DO0FBSXBDLG1GQUEyRTtBQUUzRSx1RUFBb0U7QUFDcEUsMkZBQWtFO0FBQ2xFLHdFQUE4RDtBQUM5RCxvRkFBcUU7QUFDckUsdUZBQThEO0FBQzlELHNFQUc2QztBQUM3QywwRkFBaUU7QUFFakUsTUFBTSxNQUFNLEdBQUcsc0JBQU0sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0FBQzlDLE1BQU0sZUFBZTtJQUFyQjtRQUNFLFdBQU0sR0FBRyxDQUFPLEdBQTBCLEVBQUUsR0FBUSxFQUFFLEVBQUU7WUFDdEQsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBRWxDLElBQUksR0FBRyxDQUFDLElBQUksWUFBWSxLQUFLLEVBQUU7Z0JBQzdCLE1BQU0sUUFBUSxHQUFHLE1BQU0sdUJBQVksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDakUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7YUFDeEM7aUJBQU07Z0JBQ0wsTUFBTSxRQUFRLEdBQUcsTUFBTSx1QkFBWSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUM3RCxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQzthQUN4QztRQUNILENBQUMsQ0FBQSxDQUFDO1FBRUYsV0FBTSxHQUFHLENBQU8sR0FBb0IsRUFBRSxHQUFRLEVBQUUsRUFBRTtZQUNoRCxNQUFNLE1BQU0s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