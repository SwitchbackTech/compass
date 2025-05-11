import React from "react";
import { Priority } from "@core/constants/core.constants";
import { StyledSaveBtn } from "@web/components/Button/styled";
import { StyledSubmitRow } from "../styled";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { DesktopOS, getDesktopOS } from "@web/common/utils/device.util";
import { Command, WindowsLogo } from "@phosphor-icons/react";

interface Props {
  onSubmit: () => void;
  priority: Priority;
}

export const SaveSection: React.FC<Props> = ({
  onSubmit: _onSubmit,
  priority,
}) => {
  
  let isMacOS = false;
  
  const desktopOs = getDesktopOS();
  if(desktopOs === DesktopOS.MacOS) {
    isMacOS = true;
  }

  return (
    <StyledSubmitRow>
    <TooltipWrapper onClick={_onSubmit} shortcut={
      <>
      {isMacOS ? <Command size={16}/> : <WindowsLogo size={16} />} + Enter
      </>
    } description="Save event">
      <StyledSaveBtn
        minWidth={110}
        priority={priority}
        role="tab"
        tabIndex={0}
        title="Save event"
        onClick={_onSubmit}
      >
        Save
      </StyledSaveBtn>
    </TooltipWrapper>
    </StyledSubmitRow>
  );
};
