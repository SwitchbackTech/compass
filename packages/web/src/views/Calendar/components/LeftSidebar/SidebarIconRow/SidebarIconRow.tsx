import React, { FC } from "react";
import { MonthCalendarIcon } from "@web/components/Icons/MonthCalendarIcon";
import { Preferences } from "@web/views/Calendar/hooks/usePreferences";

import { StyledBottomRow } from "../styled";

interface Props {
  prefs: Preferences;
}

export const SidebarIconRow: FC<Props> = ({ prefs }) => {
  return (
    <StyledBottomRow>
      <MonthCalendarIcon prefs={prefs} />
    </StyledBottomRow>
  );
};
