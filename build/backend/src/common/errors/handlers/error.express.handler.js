"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleExpressError = void 0;
const errors_base_1 = require("@core/errors/errors.base");
const error_handler_1 = require("./error.handler");
const common_helpers_1 = require("../../helpers/common.helpers");
/*
const invalidPathHandler = (
  //@ts-ignore
  req: express.Request,
  res: express.Request,
  next: express.NextFunction
) => {
  //@ts-ignore
  res.redirect("/error");
  next();
};
*/
const handleExpressError = (res, err) => {
  error_handler_1.errorHandler.log(err);
  res.header("Content-Type", "application/json");
  if (err instanceof errors_base_1.BaseError) {
    res.status(err.statusCode).send(err);
  } else {
    //TODO convert this object into one that has same keys as BaseError (?)
    const errInfo = { name: err.name, message: err.message };
    if ((0, common_helpers_1.isDev)()) {
      //@ts-ignore
      errInfo.stack = err.stack;
    }
    //@ts-ignore
    res.status(err.status || 500).send(errInfo);
  }
  if (!error_handler_1.errorHandler.isOperational(err)) {
    error_handler_1.errorHandler.exitAfterProgrammerError();
  }
};
exports.handleExpressError = handleExpressError;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3IuZXhwcmVzcy5oYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYmFja2VuZC9zcmMvY29tbW9uL2Vycm9ycy9oYW5kbGVycy9lcnJvci5leHByZXNzLmhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsMERBQXFEO0FBRXJELG1EQUErQztBQUMvQyxpRUFBcUQ7QUFFckQ7Ozs7Ozs7Ozs7O0VBV0U7QUFFSyxNQUFNLGtCQUFrQixHQUFHLENBQUMsR0FBcUIsRUFBRSxHQUFVLEVBQUUsRUFBRTtJQUN0RSw0QkFBWSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUV0QixHQUFHLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO0lBQy9DLElBQUksR0FBRyxZQUFZLHVCQUFTLEVBQUU7UUFDNUIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQ3RDO1NBQU07UUFDTCx1RUFBdUU7UUFDdkUsTUFBTSxPQUFPLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3pELElBQUksSUFBQSxzQkFBSyxHQUFFLEVBQUU7WUFDWCxZQUFZO1lBQ1osT0FBTyxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1NBQzNCO1FBQ0QsWUFBWTtRQUNaLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7S0FDN0M7SUFFRCxJQUFJLENBQUMsNEJBQVksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDcEMsNEJBQVksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO0tBQ3pDO0FBQ0gsQ0FBQyxDQUFDO0FBcEJXLFFBQUEsa0JBQWtCLHNCQW9CN0IifQ==
