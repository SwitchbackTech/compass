"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const priority_service_1 = (0, tslib_1.__importDefault)(
  require("../services/priority.service")
);
class PriorityController {
  constructor() {
    this.create = (req, res) =>
      (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const userId = res.locals.user.id;
        const data = req.body;
        const createRes = yield priority_service_1.default.create(userId, data);
        //@ts-ignore
        res.promise(Promise.resolve(createRes));
      });
    this.delete = (req, res) =>
      (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        //@ts-ignore
        const priorityId = req.params.id;
        const deleteResponse = yield priority_service_1.default.deleteById(
          priorityId
        );
        //@ts-ignore
        res.promise(Promise.resolve(deleteResponse));
      });
    this.readAll = (req, res) =>
      (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        const userId = res.locals.user.id;
        const priorities = yield priority_service_1.default.list(userId);
        res.promise(Promise.resolve(priorities));
      });
    this.readById = (req, res) =>
      (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        //@ts-ignore
        const userId = res.locals.user.id;
        const priority = yield priority_service_1.default.readById(
          userId,
          req.params.id
        );
        res.promise(Promise.resolve(priority));
      });
    this.update = (req, res) =>
      (0, tslib_1.__awaiter)(this, void 0, void 0, function* () {
        //@ts-ignore
        const priorityId = req.params.id;
        //@ts-ignore
        const priority = req.body;
        //@ts-ignore
        const response = yield priority_service_1.default.updateById(
          priorityId,
          priority
        );
        //@ts-ignore
        res.promise(Promise.resolve(response));
      });
  }
}
exports.default = new PriorityController();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJpb3JpdHkuY29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2JhY2tlbmQvc3JjL3ByaW9yaXR5L2NvbnRyb2xsZXJzL3ByaW9yaXR5LmNvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBS0EsaUdBQTJEO0FBRTNELE1BQU0sa0JBQWtCO0lBQXhCO1FBQ0UsV0FBTSxHQUFHLENBQU8sR0FBb0IsRUFBRSxHQUFRLEVBQUUsRUFBRTtZQUNoRCxNQUFNLE1BQU0sR0FBVyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQWdCLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFDbkMsTUFBTSxTQUFTLEdBQUcsTUFBTSwwQkFBZSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDN0QsWUFBWTtZQUNaLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQzFDLENBQUMsQ0FBQSxDQUFDO1FBRUYsV0FBTSxHQUFHLENBQU8sR0FBb0IsRUFBRSxHQUFxQixFQUFFLEVBQUU7WUFDN0QsWUFBWTtZQUNaLE1BQU0sVUFBVSxHQUFXLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ3pDLE1BQU0sY0FBYyxHQUFHLE1BQU0sMEJBQWUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDcEUsWUFBWTtZQUNaLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1FBQy9DLENBQUMsQ0FBQSxDQUFDO1FBRUYsWUFBTyxHQUFHLENBQU8sR0FBb0IsRUFBRSxHQUFxQixFQUFFLEVBQUU7WUFDOUQsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sVUFBVSxHQUFHLE1BQU0sMEJBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdEQsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDM0MsQ0FBQyxDQUFBLENBQUM7UUFFRixhQUFRLEdBQUcsQ0FBTyxHQUFvQixFQUFFLEdBQXFCLEVBQUUsRUFBRTtZQUMvRCxZQUFZO1lBQ1osTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sUUFBUSxHQUFHLE1BQU0sMEJBQWUsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDdkUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDekMsQ0FBQyxDQUFBLENBQUM7UUFFRixXQUFNLEdBQUcsQ0FBTyxHQUFvQixFQUFFLEdBQXFCLEVBQUUsRUFBRTtZQUM3RCxZQUFZO1lBQ1osTUFBTSxVQUFVLEdBQVcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDekMsWUFBWTtZQUNaLE1BQU0sUUFBUSxHQUFnQixHQUFHLENBQUMsSUFBSSxDQUFDO1lBQ3ZDLFlBQVk7WUFDWixNQUFNLFFBQVEsR0FBRyxNQUFNLDBCQUFlLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUN4RSxZQUFZO1lBQ1osR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDekMsQ0FBQyxDQUFBLENBQUM7SUFDSixDQUFDO0NBQUE7QUFFRCxrQkFBZSxJQUFJLGtCQUFrQixFQUFFLENBQUMifQ==
