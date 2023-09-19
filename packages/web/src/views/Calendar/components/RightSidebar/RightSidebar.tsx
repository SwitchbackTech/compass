import React, { FC } from "react";
import { useAppSelector } from "@web/store/store.hooks";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { selectIsRightSidebarOpen } from "@web/ducks/settings/selectors/settings.selectors";
import { Divider } from "@web/components/Divider";
import { getAlphaColor } from "@core/util/color.utils";
import { ColorNames } from "@core/types/color.types";

import { StyledRightSidebar } from "./styled";
import { ToggleableMonthWidget } from "../LeftSidebar/ToggleableMonthWidget";

interface Props {
  weekProps: WeekProps;
}

export const RightSidebar: FC<Props> = (props) => {
  const isRightSidebarOpen = useAppSelector(selectIsRightSidebarOpen);

  if (!isRightSidebarOpen) return null;

  const handleCheckboxChange = (e) => {
    alert("can't touch this");
  };

  return (
    <StyledRightSidebar>
      <ToggleableMonthWidget
        monthsShown={1}
        setStartOfView={props.weekProps.state.setStartOfView}
        isCurrentWeek={props.weekProps.component.isCurrentWeek}
        weekStart={props.weekProps.component.startOfView}
      />
      <div>
        <Divider
          color={getAlphaColor(ColorNames.WHITE_4, 0.5)}
          role="separator"
          title="right sidebar divider"
          withAnimation={false}
        />
        <p>Calendars</p>
        <label>
          <input
            checked={true}
            disabled={true}
            onChange={handleCheckboxChange}
            type="checkbox"
          />
          primary
        </label>

        <Divider
          color={getAlphaColor(ColorNames.WHITE_4, 0.5)}
          role="separator"
          title="right sidebar divider"
          withAnimation={false}
        />

        <Divider
          color={getAlphaColor(ColorNames.WHITE_4, 0.5)}
          role="separator"
          title="right sidebar divider"
          withAnimation={false}
        />

        <Divider
          color={getAlphaColor(ColorNames.WHITE_4, 0.5)}
          role="separator"
          title="right sidebar divider"
          withAnimation={false}
        />
        <p>Thanks for trying Compass 💙</p>
      </div>
    </StyledRightSidebar>
  );
};
