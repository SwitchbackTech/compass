"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GCAL_PRIMARY =
  exports.GCAL_NOTIFICATION_URL =
  exports.BASE_URL_DEV =
  exports.BACKEND_URL =
  exports.NodeEnv =
    void 0;
var NodeEnv;
(function (NodeEnv) {
  NodeEnv["Development"] = "development";
  NodeEnv["Production"] = "production";
  NodeEnv["Test"] = "test";
})((NodeEnv = exports.NodeEnv || (exports.NodeEnv = {})));
/*
Infers the API URL based on the environment
*/
const _getBaseUrl = () => {
  if (process.env["NODE_ENV"] === NodeEnv.Production) {
    return process.env["BASEURL_PROD"];
  } else if (process.env["NODE_ENV"] === NodeEnv.Development) {
    return exports.BASE_URL_DEV;
  }
  const msg = `Invalid NODE_ENV value: '${process.env["NODE_ENV"]}' Change env config/params`;
  // jests sets this env, so make sure its not running in a test
  // before throwing this error
  if (process.env["NODE_ENV"] !== NodeEnv.Test) {
    throw new Error(msg);
  }
  return new Error(msg);
};
// TOOD convert baseurl code to env.constants
exports.BACKEND_URL = _getBaseUrl();
exports.BASE_URL_DEV = `http://localhost:${process.env["PORT"] || 3000}`;
exports.GCAL_NOTIFICATION_URL = "/api/sync/gcal/notifications";
exports.GCAL_PRIMARY = "primary";
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2VuZC5jb25zdGFudHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9iYWNrZW5kL3NyYy9jb21tb24vY29uc3RhbnRzL2JhY2tlbmQuY29uc3RhbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLElBQVksT0FJWDtBQUpELFdBQVksT0FBTztJQUNqQixzQ0FBMkIsQ0FBQTtJQUMzQixvQ0FBeUIsQ0FBQTtJQUN6Qix3QkFBYSxDQUFBO0FBQ2YsQ0FBQyxFQUpXLE9BQU8sR0FBUCxlQUFPLEtBQVAsZUFBTyxRQUlsQjtBQUVEOztFQUVFO0FBQ0YsTUFBTSxXQUFXLEdBQUcsR0FBRyxFQUFFO0lBQ3ZCLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxPQUFPLENBQUMsVUFBVSxFQUFFO1FBQ2xELE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztLQUNwQztTQUFNLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxPQUFPLENBQUMsV0FBVyxFQUFFO1FBQzFELE9BQU8sb0JBQVksQ0FBQztLQUNyQjtJQUVELE1BQU0sR0FBRyxHQUFHLDRCQUE0QixPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyw0QkFBNEIsQ0FBQztJQUM1Riw4REFBOEQ7SUFDOUQsNkJBQTZCO0lBQzdCLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxPQUFPLENBQUMsSUFBSSxFQUFFO1FBQzVDLE1BQU0sSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDdEI7SUFDRCxPQUFPLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3hCLENBQUMsQ0FBQztBQUVGLDZDQUE2QztBQUNoQyxRQUFBLFdBQVcsR0FBRyxXQUFXLEVBQUUsQ0FBQztBQUM1QixRQUFBLFlBQVksR0FBRyxvQkFBb0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQztBQUNqRSxRQUFBLHFCQUFxQixHQUFHLDhCQUE4QixDQUFDO0FBQ3ZELFFBQUEsWUFBWSxHQUFHLFNBQVMsQ0FBQyJ9
