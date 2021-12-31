/* tried putting BASEURL in @core, but 
had trouble getting client to read from process.env,
so moved here for now */
const _getBaseUrl = () => {
  if (process.env.ENV === "prod") {
    return process.env.BASEURL_PROD;
  } else if (process.env.ENV === "dev") {
    return process.env.BASEURL_DEV;
  } else {
    throw new Error(`Invalid ENV value: ${process.env.ENV}. Change config.`);
  }
};

export const GCAL_PRIMARY = "primary";
export const GCAL_NOTIFICATION_URL = "/sync/gcal/notifications";

export const BASEURL = _getBaseUrl();
export const MB_50 = 50000000; // in bytes
