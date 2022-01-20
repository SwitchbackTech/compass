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
const google_auth_service_1 = require("@backend/auth/services/google.auth.service");
const sync_service_1 = __importDefault(require("../services/sync.service"));
class GcalSyncController {
    constructor() {
        this.handleNotification = (req, res) => __awaiter(this, void 0, void 0, function* () {
            //TODO validate request
            // hacky way to appease typescript, since these headers can also be string[]
            if (typeof req.headers["x-goog-channel-id"] === "string" &&
                typeof req.headers["x-goog-resource-id"] === "string" &&
                typeof req.headers["x-goog-resource-state"] === "string" &&
                typeof req.headers["x-goog-channel-expiration"] === "string") {
                const params = {
                    channelId: req.headers["x-goog-channel-id"],
                    resourceId: req.headers["x-goog-resource-id"],
                    resourceState: req.headers["x-goog-resource-state"],
                    expiration: req.headers["x-goog-channel-expiration"],
                };
                const notifResponse = yield sync_service_1.default.handleGcalNotification(params);
                res.promise(Promise.resolve(notifResponse));
            }
        });
        this.startWatching = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = res.locals.user.id;
                const calendarId = req.body.calendarId;
                const channelId = req.body.channelId;
                const gcal = yield google_auth_service_1.getGcal(userId);
                const watchResult = yield sync_service_1.default.startWatchingChannel(gcal, calendarId, channelId);
                res.promise(Promise.resolve(watchResult));
            }
            catch (e) {
                res.promise(Promise.reject(e));
            }
        });
        this.stopWatching = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = res.locals.user.id;
                const channelId = req.body.channelId;
                const resourceId = req.body.resourceId;
                const stopResult = yield sync_service_1.default.stopWatchingChannel(userId, channelId, resourceId);
                res.promise(Promise.resolve(stopResult));
            }
            catch (e) {
                res.promise(Promise.reject(e));
            }
        });
    }
}
exports.default = new GcalSyncController();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3luYy5nY2FsLmNvbnRyb2xsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvc3luYy9jb250cm9sbGVycy9zeW5jLmdjYWwuY29udHJvbGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQVFBLG9GQUFxRTtBQUVyRSw0RUFBbUQ7QUFFbkQsTUFBTSxrQkFBa0I7SUFBeEI7UUFDRSx1QkFBa0IsR0FBRyxDQUFPLEdBQW9CLEVBQUUsR0FBcUIsRUFBRSxFQUFFO1lBQ3pFLHVCQUF1QjtZQUV2Qiw0RUFBNEU7WUFDNUUsSUFDRSxPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsS0FBSyxRQUFRO2dCQUNwRCxPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQUMsS0FBSyxRQUFRO2dCQUNyRCxPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsdUJBQXVCLENBQUMsS0FBSyxRQUFRO2dCQUN4RCxPQUFPLEdBQUcsQ0FBQyxPQUFPLENBQUMsMkJBQTJCLENBQUMsS0FBSyxRQUFRLEVBQzVEO2dCQUNBLE1BQU0sTUFBTSxHQUFHO29CQUNiLFNBQVMsRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDO29CQUMzQyxVQUFVLEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQztvQkFDN0MsYUFBYSxFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsdUJBQXVCLENBQUM7b0JBQ25ELFVBQVUsRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLDJCQUEyQixDQUFDO2lCQUNyRCxDQUFDO2dCQUVGLE1BQU0sYUFBYSxHQUFHLE1BQU0sc0JBQVcsQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFFdkUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7YUFDN0M7UUFDSCxDQUFDLENBQUEsQ0FBQztRQUVGLGtCQUFhLEdBQUcsQ0FBTyxHQUFtQyxFQUFFLEdBQVEsRUFBRSxFQUFFO1lBQ3RFLElBQUk7Z0JBQ0YsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNsQyxNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQztnQkFDdkMsTUFBTSxTQUFTLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBRXJDLE1BQU0sSUFBSSxHQUFHLE1BQU0sNkJBQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDbkMsTUFBTSxXQUFXLEdBQUcsTUFBTSxzQkFBVyxDQUFDLG9CQUFvQixDQUN4RCxJQUFJLEVBQ0osVUFBVSxFQUNWLFNBQVMsQ0FDVixDQUFDO2dCQUVGLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO2FBQzNDO1lBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ1YsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDaEM7UUFDSCxDQUFDLENBQUEsQ0FBQztRQUVGLGlCQUFZLEdBQUcsQ0FBTyxHQUFrQyxFQUFFLEdBQVEsRUFBRSxFQUFFO1lBQ3BFLElBQUk7Z0JBQ0YsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUNsQyxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDckMsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7Z0JBRXZDLE1BQU0sVUFBVSxHQUFHLE1BQU0sc0JBQVcsQ0FBQyxtQkFBbUIsQ0FDdEQsTUFBTSxFQUNOLFNBQVMsRUFDVCxVQUFVLENBQ1gsQ0FBQztnQkFDRixHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQzthQUMxQztZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNWLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ2hDO1FBQ0gsQ0FBQyxDQUFBLENBQUM7SUFDSixDQUFDO0NBQUE7QUFFRCxrQkFBZSxJQUFJLGtCQUFrQixFQUFFLENBQUMifQ==