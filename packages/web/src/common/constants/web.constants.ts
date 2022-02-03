export const getBaseUrl = () => {
  if (process.env.NODE_ENV === "production") {
    return "https://***REMOVED***/api";
  } else {
    return `http://localhost:${_BACKEND_PORT}/api`;
  }
};

const _BACKEND_PORT = 3000;
export const ANIMATION_TIME_3_MS = "0.3s";
export const API_BASEURL = getBaseUrl();
export const GOOGLE = "google";

// $$ add other LS keys
export enum LocalStorage {
  TIMEZONE = "timezone",
}
