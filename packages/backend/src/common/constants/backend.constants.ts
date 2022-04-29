export enum NodeEnv {
  Development = "development",
  Production = "production",
  Test = "test",
}

/* 
Infers the API URL based on the environment
*/
const _getBaseUrl = () => {
  if (process.env["NODE_ENV"] === NodeEnv.Production) {
    return process.env["BASEURL_PROD"];
  } else if (process.env["NODE_ENV"] === NodeEnv.Development) {
    return BASE_URL_DEV;
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
export const BACKEND_URL = _getBaseUrl();
export const BASE_URL_DEV = `http://localhost:${process.env["PORT"] || 3000}`;
export const GCAL_NOTIFICATION_URL = "/api/sync/gcal/notifications";
export const GCAL_PRIMARY = "primary";
export const SOMEDAY_EVENTS_LIMIT = 10;
