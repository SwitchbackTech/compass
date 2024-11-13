import React from "react";
import { MetaKeyIcon } from "@web/components/Icons/MetaKey";
import { CalendarIcon } from "@web/components/Icons/Calendar";

import { StyledIconRow, StyledLeftIconGroup } from "../styled";

export const SidebarIconRow = () => {
  return (
    <StyledIconRow>
      <StyledLeftIconGroup>
        <MetaKeyIcon size={25} />
        <CalendarIcon size={25} />
      </StyledLeftIconGroup>
    </StyledIconRow>
  );
};
