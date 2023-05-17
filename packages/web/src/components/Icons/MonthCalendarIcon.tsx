import React, { FC } from "react";
import { getColor } from "@core/util/color.utils";
import { ColorNames } from "@core/types/color.types";
import { StyledMonthCalendarIcon } from "../Svg";
import { TooltipWrapper } from "../Tooltip/TooltipWrapper";
import { Preferences } from "@web/views/Calendar/hooks/usePreferences";

interface Props {
  prefs: Preferences;
}

export const MonthCalendarIcon: FC<Props> = ({ prefs }) => {
  return (
    <TooltipWrapper
      description={`${
        prefs.isMonthWidgetOpen ? "Hide" : "Show"
      } month calendar`}
      onClick={() => prefs.toggleMonthWidget()}
    >
      <StyledMonthCalendarIcon hovercolor={getColor(ColorNames.WHITE_1)} />
    </TooltipWrapper>
  );
};
