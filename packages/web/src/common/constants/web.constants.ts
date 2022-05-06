export const getBaseUrl = () => {
  if (process.env["NODE_ENV"] === "production") {
    return "https://***REMOVED***/api";
  } else {
    return `http://localhost:${_BACKEND_PORT}/api`;
  }
};

const _BACKEND_PORT = 3000;

export const ANIMATION_TIME_3_MS = "0.3s";
export const API_BASEURL = getBaseUrl();
export const GOOGLE = "google";

export enum LocalStorage {
  TIMEZONE = "timezone",
  TOKEN = "token",
}

export enum ZIndex {
  LAYER_1 = 1,
  LAYER_2 = 2,
  LAYER_3 = 3,
  LAYER_4 = 4,
  LAYER_5 = 5,
  MAX = 20,
}
