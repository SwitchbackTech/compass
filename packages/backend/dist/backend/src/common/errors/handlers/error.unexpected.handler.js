"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const error_handler_1 = require("./error.handler");
process.on("uncaughtException", (error) => {
    error_handler_1.errorHandler.log(error);
    if (!error_handler_1.errorHandler.isOperational(error)) {
        error_handler_1.errorHandler.exitAfterProgrammerError();
    }
});
// get the unhandled promise rejections/exceptions and throw it to the
// `uncaughtException` fallback handler
process.on("unhandledRejection", (reason, promise) => {
    throw reason;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3IudW5leHBlY3RlZC5oYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2NvbW1vbi9lcnJvcnMvaGFuZGxlcnMvZXJyb3IudW5leHBlY3RlZC5oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsbURBQStDO0FBRS9DLE9BQU8sQ0FBQyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxLQUFZLEVBQUUsRUFBRTtJQUMvQyw0QkFBWSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN4QixJQUFJLENBQUMsNEJBQVksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDdEMsNEJBQVksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO0tBQ3pDO0FBQ0gsQ0FBQyxDQUFDLENBQUM7QUFFSCxzRUFBc0U7QUFDdEUsdUNBQXVDO0FBQ3ZDLE9BQU8sQ0FBQyxFQUFFLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxNQUFhLEVBQUUsT0FBcUIsRUFBRSxFQUFFO0lBQ3hFLE1BQU0sTUFBTSxDQUFDO0FBQ2YsQ0FBQyxDQUFDLENBQUMifQ==