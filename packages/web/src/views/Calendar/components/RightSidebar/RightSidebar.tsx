import React, { FC } from "react";
import { StyledRightSidebar } from "./styled";
import { useAppSelector } from "@web/store/store.hooks";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { selectIsRightSidebarOpen } from "@web/ducks/settings/selectors/settings.selectors";
import { Divider } from "@web/components/Divider";
import { getAlphaColor } from "@core/util/color.utils";
import { ColorNames } from "@core/types/color.types";

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
      <h3>Calendars</h3>
      <p>
        Compass currently only syncs events from your primary Google Calendar,
        although we plan to support all your subcalendars in the near future
      </p>
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
      <p>Found a bug or want to share an idea?</p>
      <a href="mailto:tyler@switchback.tech?subject=Compass%20Feedback">
        Let Tyler know️
      </a>
      <span> 📨</span>
      <Divider
        color={getAlphaColor(ColorNames.WHITE_4, 0.5)}
        role="separator"
        title="right sidebar divider"
        withAnimation={false}
      />
      <p>Thanks for trying Compass 💙</p>
    </StyledRightSidebar>
  );
};
