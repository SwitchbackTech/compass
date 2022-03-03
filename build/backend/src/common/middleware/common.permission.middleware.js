"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const winston_logger_1 = require("@core/logger/winston.logger");
const logger = (0, winston_logger_1.Logger)("app:common.permission.middleware");
class CommonPermissionMiddleware {
  permissionFlagRequired(requiredPermissionFlag) {
    return (
      //@ts-ignore
      req,
      res,
      next
    ) => {
      try {
        //@ts-ignore
        const userPermissionFlags = parseInt(res.locals.jwt.permissionFlags);
        if (userPermissionFlags & requiredPermissionFlag) {
          next();
        } else {
          res.status(403).send();
        }
      } catch (e) {
        logger.error(e);
      }
    };
  }
}
exports.default = new CommonPermissionMiddleware();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uLnBlcm1pc3Npb24ubWlkZGxld2FyZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2JhY2tlbmQvc3JjL2NvbW1vbi9taWRkbGV3YXJlL2NvbW1vbi5wZXJtaXNzaW9uLm1pZGRsZXdhcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFDQSxnRUFBcUQ7QUFJckQsTUFBTSxNQUFNLEdBQUcsSUFBQSx1QkFBTSxFQUFDLGtDQUFrQyxDQUFDLENBQUM7QUFFMUQsTUFBTSwwQkFBMEI7SUFDOUIsc0JBQXNCLENBQUMsc0JBQXNDO1FBQzNELE9BQU87UUFDTCxZQUFZO1FBQ1osR0FBb0IsRUFDcEIsR0FBcUIsRUFDckIsSUFBMEIsRUFDMUIsRUFBRTtZQUNGLElBQUk7Z0JBQ0YsWUFBWTtnQkFDWixNQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztnQkFDckUsSUFBSSxtQkFBbUIsR0FBRyxzQkFBc0IsRUFBRTtvQkFDaEQsSUFBSSxFQUFFLENBQUM7aUJBQ1I7cUJBQU07b0JBQ0wsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztpQkFDeEI7YUFDRjtZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNWLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDakI7UUFDSCxDQUFDLENBQUM7SUFDSixDQUFDO0NBd0JGO0FBRUQsa0JBQWUsSUFBSSwwQkFBMEIsRUFBRSxDQUFDIn0=
