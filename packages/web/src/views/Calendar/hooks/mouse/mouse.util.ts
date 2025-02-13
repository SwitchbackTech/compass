import {
  ID_GRID_EVENTS_ALLDAY,
  ID_GRID_EVENTS_TIMED,
  ID_GRID_MAIN,
  ID_GRID_ROW,
  ID_GRID_ROW_CONTAINER,
} from "@web/common/constants/web.constants";
import { Location_Draft } from "@web/common/types/web.event.types";

export const getClickTarget = (
  id: string,
  draftLocation?: Location_Draft | null
): Location_Draft | null => {
  if (draftLocation) return draftLocation;

  if (id.includes(ID_GRID_ROW)) return Location_Draft.MAIN_GRID;
  if (id === ID_GRID_ROW_CONTAINER) return Location_Draft.MAIN_GRID;

  if (id === ID_GRID_MAIN) return Location_Draft.MAIN_GRID;

  if (id === ID_GRID_EVENTS_TIMED) return Location_Draft.MAIN_GRID_EVENT;
  if (id === ID_GRID_EVENTS_ALLDAY) return Location_Draft.ALLDAY_ROW;

  return null;
};
