/* 
Infers the API URL based on the environment
*/
const _getBaseUrl = () => {
  if (process.env.BACKEND_ENV === "prod") {
    return process.env.BASEURL_PROD;
  } else if (process.env.BACKEND_ENV === "dev") {
    return `http://localhost:${process.env.PORT}`;
  } else {
    if (process.env.NODE_ENV !== "test") {
      // jests sets this env, so make sure its not running in a test
      // before throwing this error
      throw new Error(
        `Invalid BACKEND_ENV value: '${process.env.BACKEND_ENV}' Change config.`
      );
    }
  }
};

export const BACKEND_URL = _getBaseUrl();
export const GCAL_NOTIFICATION_URL = "/api/sync/gcal/notifications";
export const GCAL_PRIMARY = "primary";
export const MB_50 = 50000000; // in bytes
