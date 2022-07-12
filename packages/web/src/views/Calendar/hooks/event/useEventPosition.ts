import { useMemo } from "react";
import { Dayjs } from "dayjs";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";

import { getPosition } from "./getPosition";

export const useEventPosition = (
  draft: Schema_GridEvent | null,
  startOfView: Dayjs,
  endOfView: Dayjs,
  measurements: Measurements_Grid
) => {
  const position = useMemo(() => {
    const calculatePosition = () => {
      const _missingProps = () => {
        const requiredProps = [
          draft?.startDate,
          draft?.endDate,
          draft?.isAllDay,
          measurements,
        ];

        return (
          requiredProps.includes(null) || requiredProps.includes(undefined)
        );
      };

      if (_missingProps()) {
        return;
      }
      const position = getPosition(
        draft,
        startOfView,
        endOfView,
        measurements,
        true
      );
      return position;
    };

    return calculatePosition();
  }, [
    draft?.startDate,
    draft?.endDate,
    draft?.isAllDay,
    draft?.row,
    startOfView,
    endOfView,
    measurements,
  ]);

  return position;
};

// OLD WAY OF DOING IT WITH CALLBACK. DELETE ONCE ABOVE WORKS ++
/*
const getEventPosition = (
  isCurrentWeek: boolean,
  startDate: string,
  endDate: string,
  isAllDay: boolean,
  columnWidths: WidthPixels
) => {
  console.log("calculating position...");
  // const isCurrentWeek = true;

  const start = dayjs(startDate);
  const end = dayjs(endDate);

  const category = getEventCategory(start, end, startOfView, endOfView);
  const startIndex = start.get("day");

  const _daysInView = 7;
  const _widths = isCurrentWeek
    ? columnWidths.current
    : (new Array(_daysInView).fill(columnWidths.pastFuture) as number[]);

  const left = getLeftPosition(category, startIndex, _widths);

  let height: number;
  let top: number;
  let width: number;
  if (isAllDay) {
    height = 20;
    //   top = GRID_Y_START + 25.26 * (event.row || 1); // found by experimenting with what 'looked right'
    top = GRID_Y_START + 25.26 * (draft?.row || 1); // found by experimenting with what 'looked right'
    //++ create util in wrapper to calc FLEX_EQUAL * currWidth
    width = isCurrentWeek
      ? columnWidths.current[startIndex]
      : columnWidths.pastFuture;
  } else {
    const duration = end.diff(start);
    const durationHours = duration * MS_IN_HR;
    //   const durationHours = (duration * MS_IN_HR).toFixed(2);
    console.log("durHrs:", durationHours);

    const startTime = ACCEPTED_TIMES.indexOf(start.format(HOURS_AM_FORMAT)) / 4;
    console.log(startTime);
    const hourlyCellHeight = 60.81818181818182;
    top = hourlyCellHeight * startTime; //$$
    height = hourlyCellHeight * durationHours;

    // $$
    // const colWidth = core.getColumnWidth(startIndex);
    // width = colWidth - EVENT_PADDING_RIGHT || 0;
  }
  return { height: 0, left: 0, top: 0, width: 0 };
};
export const useEventPositionOld = (
  draft: Schema_GridEvent | null,
  isCurrentWeek: boolean,
  startOfView: Dayjs,
  endOfView: Dayjs,
  columnWidths: WidthPixels
) => {
  const [position, setPosition] = useState<GridPosition | null>(null);

  const oldcalculatePosition = useCallback(() => {
    const _missingProps = () => {
      const requiredProps = [
        isCurrentWeek,
        draft?.startDate,
        draft?.endDate,
        draft?.isAllDay,
        columnWidths?.current,
        columnWidths?.pastFuture,
      ];

      return requiredProps.includes(null) || requiredProps.includes(undefined);
    };

    if (_missingProps()) {
      console.log("something missing");
      return;
    }

    console.log("calculating position...");

    const start = dayjs(draft.startDate);
    const end = dayjs(draft.endDate);

    const category = getEventCategory(start, end, startOfView, endOfView);
    const startIndex = start.get("day");

    const _daysInView = 7;
    const _widths = isCurrentWeek
      ? columnWidths.current
      : (new Array(_daysInView).fill(columnWidths.pastFuture) as number[]);

    const left = getLeftPosition(category, startIndex, _widths);

    let height: number;
    let top: number;
    let width: number;
    if (draft.isAllDay) {
      height = 20;
      //   top = GRID_Y_START + 25.26 * (event.row || 1); // found by experimenting with what 'looked right'
      top = GRID_Y_START + 25.26 * (draft?.row || 1); // found by experimenting with what 'looked right'
      //++ create util in wrapper to calc FLEX_EQUAL * currWidth
      width = isCurrentWeek
        ? columnWidths.current[startIndex]
        : columnWidths.pastFuture;
    } else {
      const duration = end.diff(start);
      const durationHours = duration * MS_IN_HR;
      //   const durationHours = (duration * MS_IN_HR).toFixed(2);
      console.log("durHrs:", durationHours);

      const startTime =
        ACCEPTED_TIMES.indexOf(start.format(HOURS_AM_FORMAT)) / 4;
      console.log(startTime);
      const hourlyCellHeight = 60.81818181818182;
      top = hourlyCellHeight * startTime; //$$
      height = hourlyCellHeight * durationHours;

      // $$
      // const colWidth = core.getColumnWidth(startIndex);
      // width = colWidth - EVENT_PADDING_RIGHT || 0;
    }

    const vals = { height, left, top, width };
    setPosition(vals);
  }, [
    isCurrentWeek,
    draft?.startDate,
    draft?.endDate,
    draft?.isAllDay,
    draft?.row,
    startOfView,
    endOfView,
    columnWidths,
  ]);

  useEffect(() => {
    if (!draft) return;
    calculatePosition();

    // not including draft in deps array, because that will
    // cause calculation to run for title and description changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculatePosition]);

  return position;
};
*/
