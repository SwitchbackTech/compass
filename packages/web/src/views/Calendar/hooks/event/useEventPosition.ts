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
