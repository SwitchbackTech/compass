"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MB_50 = exports.BASEURL = exports.GCAL_NOTIFICATION_URL = exports.GCAL_PRIMARY = void 0;
/* tried putting BASEURL in @core, but
had trouble getting client to read from process.env,
so moved here for now */
const _getBaseUrl = () => {
    if (process.env.ENV === "prod") {
        return process.env.BASEURL_PROD;
    }
    else if (process.env.ENV === "dev") {
        return process.env.BASEURL_DEV;
    }
    else {
        if (process.env.NODE_ENV !== "test") {
            // jests sets this env, so make sure its not running in a test
            // before throwing this error
            throw new Error(`Invalid ENV value: ${process.env.ENV}. Change config.`);
        }
    }
};
exports.GCAL_PRIMARY = "primary";
exports.GCAL_NOTIFICATION_URL = "/sync/gcal/notifications";
exports.BASEURL = _getBaseUrl();
exports.MB_50 = 50000000; // in bytes
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2VuZC5jb25zdGFudHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvY29tbW9uL2NvbnN0YW50cy9iYWNrZW5kLmNvbnN0YW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQTs7d0JBRXdCO0FBQ3hCLE1BQU0sV0FBVyxHQUFHLEdBQUcsRUFBRTtJQUN2QixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLE1BQU0sRUFBRTtRQUM5QixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDO0tBQ2pDO1NBQU0sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxLQUFLLEVBQUU7UUFDcEMsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQztLQUNoQztTQUFNO1FBQ0wsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsS0FBSyxNQUFNLEVBQUU7WUFDbkMsOERBQThEO1lBQzlELDZCQUE2QjtZQUM3QixNQUFNLElBQUksS0FBSyxDQUFDLHNCQUFzQixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsa0JBQWtCLENBQUMsQ0FBQztTQUMxRTtLQUNGO0FBQ0gsQ0FBQyxDQUFDO0FBRVcsUUFBQSxZQUFZLEdBQUcsU0FBUyxDQUFDO0FBQ3pCLFFBQUEscUJBQXFCLEdBQUcsMEJBQTBCLENBQUM7QUFFbkQsUUFBQSxPQUFPLEdBQUcsV0FBVyxFQUFFLENBQUM7QUFDeEIsUUFBQSxLQUFLLEdBQUcsUUFBUSxDQUFDLENBQUMsV0FBVyJ9