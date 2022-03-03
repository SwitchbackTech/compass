"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promiseMiddleware =
  exports.catchSyncErrors =
  exports.catchUndefinedSyncErrors =
    void 0;
const errors_base_1 = require("@core/errors/errors.base");
const winston_logger_1 = require("@core/logger/winston.logger");
const error_express_handler_1 = require("../errors/handlers/error.express.handler");
const logger = (0, winston_logger_1.Logger)("app:promise.middleware");
const catchUndefinedSyncErrors = (
  // err not provided, so create one
  req,
  res,
  next
) => {
  const baseErr = new errors_base_1.BaseError(
    "Some Bad Sync Err Happened",
    `${req}`,
    500,
    false
  );
  //@ts-ignore
  res.promise(Promise.reject(baseErr));
};
exports.catchUndefinedSyncErrors = catchUndefinedSyncErrors;
const catchSyncErrors = (
  // sync errors thrown by 3rd party libraries or by this app
  err,
  req,
  res,
  next
) => {
  //@ts-ignore
  res.promise(Promise.reject(err));
};
exports.catchSyncErrors = catchSyncErrors;
const sendResponse = (res, data) => {
  if (data === null) {
    //todo extend to allow for sending no data, just success code?
    logger.error(`Sync error cuz no data provided for response`);
    res.status(500).send("uh oh, no data provided");
  }
  //@ts-ignore
  const code = data.statusCode || 200;
  res.status(code).send(data);
};
function promiseMiddleware() {
  /*
  - turns everything into a promise, so you can have one place to
  handle both sync and async errors
  - reduces how much error handling you have to do for controllers/services
  */
  return (
    req,
    // res: express.Response,
    res,
    next
  ) => {
    // res.promise = (p) => {
    res.promise = (p) => {
      //function or promise
      let promiseToResolve;
      //@ts-ignore
      if (p.then && p.catch) {
        promiseToResolve = p;
      } else if (typeof p === "function") {
        promiseToResolve = Promise.resolve().then(() => p());
      } else {
        promiseToResolve = Promise.resolve(p);
      }
      //@ts-ignore
      return promiseToResolve
        .then((data) => sendResponse(res, data))
        .catch((e) => (0, error_express_handler_1.handleExpressError)(res, e));
    };
    return next();
  };
}
exports.promiseMiddleware = promiseMiddleware;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbWlzZS5taWRkbGV3YXJlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYmFja2VuZC9zcmMvY29tbW9uL21pZGRsZXdhcmUvcHJvbWlzZS5taWRkbGV3YXJlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUdBLDBEQUFxRDtBQUNyRCxnRUFBcUQ7QUFFckQsb0ZBQThFO0FBRTlFLE1BQU0sTUFBTSxHQUFHLElBQUEsdUJBQU0sRUFBQyx3QkFBd0IsQ0FBQyxDQUFDO0FBRXpDLE1BQU0sd0JBQXdCLEdBQUc7QUFDdEMsa0NBQWtDO0FBQ2xDLEdBQW9CLEVBQ3BCLEdBQXFCLEVBQ3JCLElBQTBCLEVBQzFCLEVBQUU7SUFDRixNQUFNLE9BQU8sR0FBYyxJQUFJLHVCQUFTLENBQ3RDLDRCQUE0QixFQUM1QixHQUFHLEdBQUcsRUFBRSxFQUNSLEdBQUcsRUFDSCxLQUFLLENBQ04sQ0FBQztJQUNGLFlBQVk7SUFDWixHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUN2QyxDQUFDLENBQUM7QUFkVyxRQUFBLHdCQUF3Qiw0QkFjbkM7QUFFSyxNQUFNLGVBQWUsR0FBRztBQUM3QiwyREFBMkQ7QUFDM0QsR0FBVSxFQUNWLEdBQW9CLEVBQ3BCLEdBQXFCLEVBQ3JCLElBQTBCLEVBQzFCLEVBQUU7SUFDRixZQUFZO0lBQ1osR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDbkMsQ0FBQyxDQUFDO0FBVFcsUUFBQSxlQUFlLG1CQVMxQjtBQUVGLE1BQU0sWUFBWSxHQUFHLENBQUMsR0FBcUIsRUFBRSxJQUE2QixFQUFFLEVBQUU7SUFDNUUsSUFBSSxJQUFJLEtBQUssSUFBSSxFQUFFO1FBQ2pCLDhEQUE4RDtRQUM5RCxNQUFNLENBQUMsS0FBSyxDQUFDLDhDQUE4QyxDQUFDLENBQUM7UUFDN0QsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQztLQUNqRDtJQUNELFlBQVk7SUFDWixNQUFNLElBQUksR0FBVyxJQUFJLENBQUMsVUFBVSxJQUFJLEdBQUcsQ0FBQztJQUM1QyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUM5QixDQUFDLENBQUM7QUFFRixTQUFnQixpQkFBaUI7SUFDL0I7Ozs7SUFJQTtJQUNBLE9BQU8sQ0FDTCxHQUFvQjtJQUNwQix5QkFBeUI7SUFDekIsR0FBZ0IsRUFDaEIsSUFBMEIsRUFDMUIsRUFBRTtRQUNGLHlCQUF5QjtRQUN6QixHQUFHLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBaUMsRUFBRSxFQUFFO1lBQ2xELHFCQUFxQjtZQUNyQixJQUFJLGdCQUFnRCxDQUFDO1lBRXJELFlBQVk7WUFDWixJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRTtnQkFDckIsZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDO2FBQ3RCO2lCQUFNLElBQUksT0FBTyxDQUFDLEtBQUssVUFBVSxFQUFFO2dCQUNsQyxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDdEQ7aUJBQU07Z0JBQ0wsZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUN2QztZQUVELFlBQVk7WUFDWixPQUFPLGdCQUFnQjtpQkFDcEIsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO2lCQUN2QyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUEsMENBQWtCLEVBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUMsQ0FBQyxDQUFDO1FBRUYsT0FBTyxJQUFJLEVBQUUsQ0FBQztJQUNoQixDQUFDLENBQUM7QUFDSixDQUFDO0FBbENELDhDQWtDQyJ9
