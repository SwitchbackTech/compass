import {
  ID_GRID_EVENTS_ALLDAY,
  ID_GRID_EVENTS_TIMED,
} from "@web/common/constants/web.constants";
import { getElemById } from "@web/common/utils/grid.util";

export const getDraftContainer = (isAllDay: boolean) => {
  //   if (!draft) return null;

  if (isAllDay) {
    return getElemById(ID_GRID_EVENTS_ALLDAY);
  }

  return getElemById(ID_GRID_EVENTS_TIMED);
};
