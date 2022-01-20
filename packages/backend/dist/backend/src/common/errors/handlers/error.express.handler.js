"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleExpressError = void 0;
const errors_base_1 = require("@core/errors/errors.base");
const error_handler_1 = require("./error.handler");
const common_helpers_1 = require("../../helpers/common.helpers");
const invalidPathHandler = (req, res, next) => {
    res.redirect("/error");
};
const handleExpressError = (res, err) => {
    error_handler_1.errorHandler.log(err);
    res.header("Content-Type", "application/json");
    if (err instanceof errors_base_1.BaseError) {
        res.status(err.statusCode).send(err);
    }
    else {
        //TODO convert this object into one that has same keys as BaseError (?)
        const errInfo = { name: err.name, message: err.message };
        if (common_helpers_1.isDev()) {
            errInfo.stack = err.stack;
        }
        res.status(err.status || 500).send(errInfo);
    }
    if (!error_handler_1.errorHandler.isOperational(err)) {
        error_handler_1.errorHandler.exitAfterProgrammerError();
    }
};
exports.handleExpressError = handleExpressError;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3IuZXhwcmVzcy5oYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2NvbW1vbi9lcnJvcnMvaGFuZGxlcnMvZXJyb3IuZXhwcmVzcy5oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLDBEQUFxRDtBQUVyRCxtREFBK0M7QUFDL0MsaUVBQXFEO0FBRXJELE1BQU0sa0JBQWtCLEdBQUcsQ0FDekIsR0FBb0IsRUFDcEIsR0FBb0IsRUFDcEIsSUFBMEIsRUFDMUIsRUFBRTtJQUNGLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDekIsQ0FBQyxDQUFDO0FBRUssTUFBTSxrQkFBa0IsR0FBRyxDQUFDLEdBQXFCLEVBQUUsR0FBVSxFQUFFLEVBQUU7SUFDdEUsNEJBQVksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFdEIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztJQUMvQyxJQUFJLEdBQUcsWUFBWSx1QkFBUyxFQUFFO1FBQzVCLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztLQUN0QztTQUFNO1FBQ0wsdUVBQXVFO1FBQ3ZFLE1BQU0sT0FBTyxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN6RCxJQUFJLHNCQUFLLEVBQUUsRUFBRTtZQUNYLE9BQU8sQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQztTQUMzQjtRQUNELEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7S0FDN0M7SUFFRCxJQUFJLENBQUMsNEJBQVksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDcEMsNEJBQVksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO0tBQ3pDO0FBQ0gsQ0FBQyxDQUFDO0FBbEJXLFFBQUEsa0JBQWtCLHNCQWtCN0IifQ==