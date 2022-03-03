"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errors_base_1 = require("@core/errors/errors.base");
const winston_logger_1 = require("@core/logger/winston.logger");
const logger = (0, winston_logger_1.Logger)("app:error.handler");
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
    logger.error(
      "Programmer error occured. Exiting to prevent app instability"
    );
    // uses 500 as code for the response error, but if the error is one of our own,
    // then a more accurate code will be given in the payload
    process.exit(1);
  }
}
exports.errorHandler = new ErrorHandler();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3IuaGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3BhY2thZ2VzL2JhY2tlbmQvc3JjL2NvbW1vbi9lcnJvcnMvaGFuZGxlcnMvZXJyb3IuaGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwwREFBcUQ7QUFDckQsZ0VBQXFEO0FBRXJELE1BQU0sTUFBTSxHQUFHLElBQUEsdUJBQU0sRUFBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBRTNDLE1BQU0sWUFBWTtJQUNULGFBQWEsQ0FBQyxLQUFZO1FBQy9CLElBQUksS0FBSyxZQUFZLHVCQUFTLEVBQUU7WUFDOUIsT0FBTyxLQUFLLENBQUMsYUFBYSxDQUFDO1NBQzVCO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBRU0sR0FBRyxDQUFDLEtBQVk7UUFDckIscUNBQXFDO1FBQ3JDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdEIsQ0FBQztJQUVELHdCQUF3QjtRQUN0QixNQUFNLENBQUMsS0FBSyxDQUNWLDhEQUE4RCxDQUMvRCxDQUFDO1FBQ0YsK0VBQStFO1FBQy9FLHlEQUF5RDtRQUN6RCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xCLENBQUM7Q0FDRjtBQUVZLFFBQUEsWUFBWSxHQUFHLElBQUksWUFBWSxFQUFFLENBQUMifQ==
