"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.promiseMiddleware = exports.catchSyncErrors = exports.catchUndefinedSyncErrors = void 0;
const errors_base_1 = require("@core/errors/errors.base");
const error_express_handler_1 = require("../errors/handlers/error.express.handler");
const common_logger_1 = require("../logger/common.logger");
const logger = common_logger_1.Logger("app:promise.middleware");
const catchUndefinedSyncErrors = (
// err not provided, so create one
req, res, next) => {
    const baseErr = new errors_base_1.BaseError("Some Bad Sync Err Happened", `${req}`, 500, false);
    res.promise(Promise.reject(baseErr));
};
exports.catchUndefinedSyncErrors = catchUndefinedSyncErrors;
const catchSyncErrors = (
// sync errors thrown by 3rd party libraries or by this app
err, req, res, next) => {
    res.promise(Promise.reject(err));
};
exports.catchSyncErrors = catchSyncErrors;
const sendResponse = (res, data) => {
    if (data === null) {
        //todo extend to allow for sending no data, just success code?
        logger.error(`Sync error cuz no data provided for response`);
        res.status(500).send("uh oh, no data provided");
    }
    const code = data.statusCode || 200;
    res.status(code).send(data);
};
function promiseMiddleware() {
    /*
  - turns everything into a promise, so you can have one place to
  handle both sync and async errors
  - reduces how much error handling you have to do for controllers/services
  */
    return (req, 
    // res: express.Response,
    res, next) => {
        // res.promise = (p) => {
        res.promise = (p) => {
            //function or promise
            let promiseToResolve;
            if (p.then && p.catch) {
                promiseToResolve = p;
            }
            else if (typeof p === "function") {
                promiseToResolve = Promise.resolve().then(() => p());
            }
            else {
                promiseToResolve = Promise.resolve(p);
            }
            return promiseToResolve
                .then((data) => sendResponse(res, data))
                .catch((e) => error_express_handler_1.handleExpressError(res, e));
        };
        return next();
    };
}
exports.promiseMiddleware = promiseMiddleware;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbWlzZS5taWRkbGV3YXJlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL2NvbW1vbi9taWRkbGV3YXJlL3Byb21pc2UubWlkZGxld2FyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFHQSwwREFBcUQ7QUFFckQsb0ZBQThFO0FBQzlFLDJEQUFpRDtBQUVqRCxNQUFNLE1BQU0sR0FBRyxzQkFBTSxDQUFDLHdCQUF3QixDQUFDLENBQUM7QUFFekMsTUFBTSx3QkFBd0IsR0FBRztBQUN0QyxrQ0FBa0M7QUFDbEMsR0FBb0IsRUFDcEIsR0FBcUIsRUFDckIsSUFBMEIsRUFDMUIsRUFBRTtJQUNGLE1BQU0sT0FBTyxHQUFjLElBQUksdUJBQVMsQ0FDdEMsNEJBQTRCLEVBQzVCLEdBQUcsR0FBRyxFQUFFLEVBQ1IsR0FBRyxFQUNILEtBQUssQ0FDTixDQUFDO0lBQ0YsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDdkMsQ0FBQyxDQUFDO0FBYlcsUUFBQSx3QkFBd0IsNEJBYW5DO0FBRUssTUFBTSxlQUFlLEdBQUc7QUFDN0IsMkRBQTJEO0FBQzNELEdBQVUsRUFDVixHQUFvQixFQUNwQixHQUFxQixFQUNyQixJQUEwQixFQUMxQixFQUFFO0lBQ0YsR0FBRyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDbkMsQ0FBQyxDQUFDO0FBUlcsUUFBQSxlQUFlLG1CQVExQjtBQUVGLE1BQU0sWUFBWSxHQUFHLENBQUMsR0FBcUIsRUFBRSxJQUE2QixFQUFFLEVBQUU7SUFDNUUsSUFBSSxJQUFJLEtBQUssSUFBSSxFQUFFO1FBQ2pCLDhEQUE4RDtRQUM5RCxNQUFNLENBQUMsS0FBSyxDQUFDLDhDQUE4QyxDQUFDLENBQUM7UUFDN0QsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMseUJBQXlCLENBQUMsQ0FBQztLQUNqRDtJQUNELE1BQU0sSUFBSSxHQUFXLElBQUksQ0FBQyxVQUFVLElBQUksR0FBRyxDQUFDO0lBQzVDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzlCLENBQUMsQ0FBQztBQUVGLFNBQWdCLGlCQUFpQjtJQUMvQjs7OztJQUlBO0lBQ0EsT0FBTyxDQUNMLEdBQW9CO0lBQ3BCLHlCQUF5QjtJQUN6QixHQUFnQixFQUNoQixJQUEwQixFQUMxQixFQUFFO1FBQ0YseUJBQXlCO1FBQ3pCLEdBQUcsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFpQyxFQUFFLEVBQUU7WUFDbEQscUJBQXFCO1lBQ3JCLElBQUksZ0JBQWdELENBQUM7WUFFckQsSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUU7Z0JBQ3JCLGdCQUFnQixHQUFHLENBQUMsQ0FBQzthQUN0QjtpQkFBTSxJQUFJLE9BQU8sQ0FBQyxLQUFLLFVBQVUsRUFBRTtnQkFDbEMsZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ3REO2lCQUFNO2dCQUNMLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDdkM7WUFFRCxPQUFPLGdCQUFnQjtpQkFDcEIsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO2lCQUN2QyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLDBDQUFrQixDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlDLENBQUMsQ0FBQztRQUVGLE9BQU8sSUFBSSxFQUFFLENBQUM7SUFDaEIsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQWhDRCw4Q0FnQ0MifQ==