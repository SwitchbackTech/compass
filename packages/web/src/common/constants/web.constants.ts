import { getAmPmTimes } from "@web/common/utils/date.utils";

export const getBaseUrl = () => {
  if (process.env["NODE_ENV"] === "production") {
    return "https://***REMOVED***/api";
  } else {
    return `http://localhost:${_BACKEND_PORT}/api`;
  }
};
export enum LocalStorage {
  TIMEZONE = "timezone",
  ACCESS_TOKEN = "accessToken",
}

export enum ZIndex {
  LAYER_1 = 1,
  LAYER_2 = 2,
  LAYER_3 = 3,
  LAYER_4 = 4,
  LAYER_5 = 5,
  MAX = 20,
}

const _BACKEND_PORT = 3000;

export const ACCEPTED_TIMES = getAmPmTimes();
export const ANIMATION_TIME_3_MS = "0.3s";
export const API_BASEURL = getBaseUrl();
export const GOOGLE = "google";

export const ID_GRID_ALLDAY_ROW = "allDayRow";
export const ID_ALLDAY_COLUMNS = "allDayColumns";
export const ID_GRID_EVENTS_ALLDAY = "allDayEvents";
export const ID_GRID_EVENTS_TIMED = "timedEvents";
export const ID_GRID_MAIN = "mainGrid";
export const ID_SIDEBAR = "sidebar";
export const ID_SIDEBAR_FORM = "sidebarForm";
