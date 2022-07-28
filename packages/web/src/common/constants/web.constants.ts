import { NodeEnv } from "@core/constants/core.constants";
import { getApiBaseUrl } from "@core/util/api.util";
import { getAmPmTimes } from "@web/common/utils/date.utils";

export enum ZIndex {
  LAYER_1 = 1,
  LAYER_2 = 2,
  LAYER_3 = 3,
  LAYER_4 = 4,
  LAYER_5 = 5,
  MAX = 20,
}

export const ACCEPTED_TIMES = getAmPmTimes();
export const ANIMATION_TIME_3_MS = "0.3s";
export const API_BASEURL = getApiBaseUrl(process.env["NODE_ENV"] as NodeEnv);
export const GOOGLE_CLIENT_ID_PROD =
  "***REMOVED***";
export const GOOGLE_CLIENT_ID_TEST =
  "***REMOVED***";
export const GOOGLE = "google";

export const ID_GRID_ALLDAY_ROW = "allDayRow";
export const ID_ALLDAY_COLUMNS = "allDayColumns";
export const ID_GRID_EVENTS_ALLDAY = "allDayEvents";
export const ID_GRID_EVENTS_TIMED = "timedEvents";
export const ID_GRID_MAIN = "mainGrid";
export const ID_SIDEBAR = "sidebar";
export const ID_SIDEBAR_FORM = "sidebarForm";
