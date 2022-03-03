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
//@ts-ignore
process.on("unhandledRejection", (reason, promise) => {
  throw reason;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3IudW5leHBlY3RlZC5oYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYmFja2VuZC9zcmMvY29tbW9uL2Vycm9ycy9oYW5kbGVycy9lcnJvci51bmV4cGVjdGVkLmhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxtREFBK0M7QUFFL0MsT0FBTyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLEtBQVksRUFBRSxFQUFFO0lBQy9DLDRCQUFZLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3hCLElBQUksQ0FBQyw0QkFBWSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUN0Qyw0QkFBWSxDQUFDLHdCQUF3QixFQUFFLENBQUM7S0FDekM7QUFDSCxDQUFDLENBQUMsQ0FBQztBQUVILHNFQUFzRTtBQUN0RSx1Q0FBdUM7QUFDdkMsWUFBWTtBQUNaLE9BQU8sQ0FBQyxFQUFFLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxNQUFhLEVBQUUsT0FBcUIsRUFBRSxFQUFFO0lBQ3hFLE1BQU0sTUFBTSxDQUFDO0FBQ2YsQ0FBQyxDQUFDLENBQUMifQ==
