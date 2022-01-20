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
const priority_service_1 = __importDefault(require("../services/priority.service"));
class PriorityController {
    constructor() {
        this.create = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const userId = res.locals.user.id;
            const data = req.body;
            const createRes = yield priority_service_1.default.create(userId, data);
            res.promise(Promise.resolve(createRes));
        });
        this.delete = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const priorityId = req.params.id;
            const deleteResponse = yield priority_service_1.default.deleteById(priorityId);
            res.promise(Promise.resolve(deleteResponse));
        });
        this.readAll = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const userId = res.locals.user.id;
            const priorities = yield priority_service_1.default.list(userId);
            res.promise(Promise.resolve(priorities));
        });
        this.readById = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const userId = res.locals.user.id;
            const priority = yield priority_service_1.default.readById(userId, req.params.id);
            res.promise(Promise.resolve(priority));
        });
        this.update = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const priorityId = req.params.id;
            const priority = req.body;
            const response = yield priority_service_1.default.updateById(priorityId, priority);
            res.promise(Promise.resolve(response));
        });
    }
}
exports.default = new PriorityController();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJpb3JpdHkuY29udHJvbGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9wcmlvcml0eS9jb250cm9sbGVycy9wcmlvcml0eS5jb250cm9sbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBS0Esb0ZBQTJEO0FBRTNELE1BQU0sa0JBQWtCO0lBQXhCO1FBQ0UsV0FBTSxHQUFHLENBQU8sR0FBb0IsRUFBRSxHQUFRLEVBQUUsRUFBRTtZQUNoRCxNQUFNLE1BQU0sR0FBVyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQWdCLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFDbkMsTUFBTSxTQUFTLEdBQUcsTUFBTSwwQkFBZSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDN0QsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDMUMsQ0FBQyxDQUFBLENBQUM7UUFFRixXQUFNLEdBQUcsQ0FBTyxHQUFvQixFQUFFLEdBQXFCLEVBQUUsRUFBRTtZQUM3RCxNQUFNLFVBQVUsR0FBVyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUN6QyxNQUFNLGNBQWMsR0FBRyxNQUFNLDBCQUFlLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3BFLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1FBQy9DLENBQUMsQ0FBQSxDQUFDO1FBRUYsWUFBTyxHQUFHLENBQU8sR0FBb0IsRUFBRSxHQUFxQixFQUFFLEVBQUU7WUFDOUQsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sVUFBVSxHQUFHLE1BQU0sMEJBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdEQsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDM0MsQ0FBQyxDQUFBLENBQUM7UUFFRixhQUFRLEdBQUcsQ0FBTyxHQUFvQixFQUFFLEdBQXFCLEVBQUUsRUFBRTtZQUMvRCxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDbEMsTUFBTSxRQUFRLEdBQUcsTUFBTSwwQkFBZSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUN2RSxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUN6QyxDQUFDLENBQUEsQ0FBQztRQUVGLFdBQU0sR0FBRyxDQUFPLEdBQW9CLEVBQUUsR0FBcUIsRUFBRSxFQUFFO1lBQzdELE1BQU0sVUFBVSxHQUFXLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ3pDLE1BQU0sUUFBUSxHQUFnQixHQUFHLENBQUMsSUFBSSxDQUFDO1lBQ3ZDLE1BQU0sUUFBUSxHQUFHLE1BQU0sMEJBQWUsQ0FBQyxVQUFVLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ3hFLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLENBQUMsQ0FBQSxDQUFDO0lBQ0osQ0FBQztDQUFBO0FBRUQsa0JBQWUsSUFBSSxrQkFBa0IsRUFBRSxDQUFDIn0=