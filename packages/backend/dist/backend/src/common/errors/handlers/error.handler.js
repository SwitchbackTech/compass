"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errors_base_1 = require("@core/errors/errors.base");
const common_logger_1 = require("../../logger/common.logger");
const logger = common_logger_1.Logger("app:error.handler");
class ErrorHandler {
    isOperational(error) {
        if (error instanceof errors_base_1.BaseError) {
            return error.isOperational;
        }
        return false;
    }
    log(error) {
        //TODO parse Error before logging (?)
        logger.error(error);
    }
    exitAfterProgrammerError() {
        logger.error("Programmer error occured. Exiting to prevent app instability");
        // uses 500 as code for the response error, but if the error is one of our own,
        // then a more accurate code will be given in the payload
        process.exit(1);
    }
}
exports.errorHandler = new ErrorHandler();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3IuaGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9jb21tb24vZXJyb3JzL2hhbmRsZXJzL2Vycm9yLmhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMERBQXFEO0FBRXJELDhEQUFvRDtBQUVwRCxNQUFNLE1BQU0sR0FBRyxzQkFBTSxDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFFM0MsTUFBTSxZQUFZO0lBQ1QsYUFBYSxDQUFDLEtBQVk7UUFDL0IsSUFBSSxLQUFLLFlBQVksdUJBQVMsRUFBRTtZQUM5QixPQUFPLEtBQUssQ0FBQyxhQUFhLENBQUM7U0FDNUI7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFTSxHQUFHLENBQUMsS0FBWTtRQUNyQixxQ0FBcUM7UUFDckMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN0QixDQUFDO0lBRUQsd0JBQXdCO1FBQ3RCLE1BQU0sQ0FBQyxLQUFLLENBQ1YsOERBQThELENBQy9ELENBQUM7UUFDRiwrRUFBK0U7UUFDL0UseURBQXlEO1FBQ3pELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEIsQ0FBQztDQUNGO0FBRVksUUFBQSxZQUFZLEdBQUcsSUFBSSxZQUFZLEVBQUUsQ0FBQyJ9