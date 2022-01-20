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
const common_logger_1 = require("@backend/common/logger/common.logger");
const gcal_service_1 = __importDefault(require("@backend/common/services/gcal/gcal.service"));
const google_auth_service_1 = require("@backend/auth/services/google.auth.service");
const calendar_service_1 = __importDefault(require("@backend/calendar/services/calendar.service"));
const logger = common_logger_1.Logger("app:calendar.controller");
class CalendarController {
    constructor() {
        this.create = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const userId = res.locals.user.id;
            const response = yield calendar_service_1.default.create(userId, req.body);
            res.promise(Promise.resolve(response));
        });
        this.list = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const userId = res.locals.user.id;
            const gcal = yield google_auth_service_1.getGcal(userId);
            const response = yield gcal_service_1.default.listCalendars(gcal);
            res.promise(Promise.resolve(response));
        });
    }
}
exports.default = new CalendarController();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsZW5kYXIuY29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9jYWxlbmRhci9jb250cm9sbGVycy9jYWxlbmRhci5jb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBS0Esd0VBQThEO0FBQzlELDhGQUFxRTtBQUNyRSxvRkFBcUU7QUFDckUsbUdBQTBFO0FBRTFFLE1BQU0sTUFBTSxHQUFHLHNCQUFNLENBQUMseUJBQXlCLENBQUMsQ0FBQztBQUVqRCxNQUFNLGtCQUFrQjtJQUF4QjtRQUNFLFdBQU0sR0FBRyxDQUFPLEdBQWlDLEVBQUUsR0FBUSxFQUFFLEVBQUU7WUFDN0QsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sUUFBUSxHQUFHLE1BQU0sMEJBQWUsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNoRSxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUN6QyxDQUFDLENBQUEsQ0FBQztRQUVGLFNBQUksR0FBRyxDQUFPLEdBQW9CLEVBQUUsR0FBUSxFQUFFLEVBQUU7WUFDOUMsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sSUFBSSxHQUFHLE1BQU0sNkJBQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNuQyxNQUFNLFFBQVEsR0FBRyxNQUFNLHNCQUFXLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZELEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLENBQUMsQ0FBQSxDQUFDO0lBQ0osQ0FBQztDQUFBO0FBRUQsa0JBQWUsSUFBSSxrQkFBa0IsRUFBRSxDQUFDIn0=