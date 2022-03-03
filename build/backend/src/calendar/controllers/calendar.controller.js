"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const gcal_service_1 = (0, tslib_1.__importDefault)(
  require("@backend/common/services/gcal/gcal.service")
);
const google_auth_service_1 = require("@backend/auth/services/google.auth.service");
const calendar_service_1 = (0, tslib_1.__importDefault)(
  require("@backend/calendar/services/calendar.service")
);
class CalendarController {
  constructor() {
    this.create = (req, res) =>
      (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const userId = res.locals.user.id;
        const response = yield calendar_service_1.default.create(
          userId,
          req.body
        );
        //@ts-ignore
        res.promise(Promise.resolve(response));
      });
    //@ts-ignore
    this.list = (req, res) =>
      (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const userId = res.locals.user.id;
        const gcal = yield (0, google_auth_service_1.getGcal)(userId);
        //@ts-ignore
        const response = yield gcal_service_1.default.listCalendars(gcal);
        //@ts-ignore
        res.promise(Promise.resolve(response));
      });
  }
}
exports.default = new CalendarController();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsZW5kYXIuY29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2JhY2tlbmQvc3JjL2NhbGVuZGFyL2NvbnRyb2xsZXJzL2NhbGVuZGFyLmNvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBR0EsMkdBQXFFO0FBQ3JFLG9GQUFxRTtBQUNyRSxnSEFBMEU7QUFFMUUsTUFBTSxrQkFBa0I7SUFBeEI7UUFDRSxXQUFNLEdBQUcsQ0FBTyxHQUFpQyxFQUFFLEdBQVEsRUFBRSxFQUFFO1lBQzdELE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNsQyxNQUFNLFFBQVEsR0FBRyxNQUFNLDBCQUFlLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDaEUsWUFBWTtZQUNaLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLENBQUMsQ0FBQSxDQUFDO1FBRUYsWUFBWTtRQUNaLFNBQUksR0FBRyxDQUFPLEdBQW9CLEVBQUUsR0FBUSxFQUFFLEVBQUU7WUFDOUMsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBQSw2QkFBTyxFQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ25DLFlBQVk7WUFDWixNQUFNLFFBQVEsR0FBRyxNQUFNLHNCQUFXLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZELFlBQVk7WUFDWixHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUN6QyxDQUFDLENBQUEsQ0FBQztJQUNKLENBQUM7Q0FBQTtBQUVELGtCQUFlLElBQUksa0JBQWtCLEVBQUUsQ0FBQyJ9
