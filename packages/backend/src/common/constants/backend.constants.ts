/* 
Infers the API URL based on the environment
*/
const _getBaseUrl = () => {
  if (process.env.NODE_ENV === NodeEnv.Production) {
    return process.env.BASEURL_PROD;
  } else if (process.env.NODE_ENV === NodeEnv.Development) {
    return BASE_URL_DEV;
  } else {
    if (process.env.NODE_ENV !== NodeEnv.Test) {
      // jests sets this env, so make sure its not running in a test
      // before throwing this error
      throw new Error(
        `Invalid NODE_ENV value: '${process.env.NODE_ENV}' Change env config/params`
      );
    }
  }
};

export const BACKEND_URL = _getBaseUrl();
export const BASE_URL_DEV = `http://localhost:${process.env.PORT}`;
export const GCAL_NOTIFICATION_URL = "/api/sync/gcal/notifications";
export const GCAL_PRIMARY = "primary";
export const MB_50 = 50000000; // in bytes

export enum NodeEnv {
  Development = "development",
  Production = "production",
  Test = "test",
}
