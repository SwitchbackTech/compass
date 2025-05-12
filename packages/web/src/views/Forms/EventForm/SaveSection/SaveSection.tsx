import React from "react";
import { Command, WindowsLogo } from "@phosphor-icons/react";
import { Priority } from "@core/constants/core.constants";
import { DesktopOS, getDesktopOS } from "@web/common/utils/device.util";
import { StyledSaveBtn } from "@web/components/Button/styled";
import { Text } from "@web/components/Text";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { StyledSubmitRow } from "../styled";

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
  if (desktopOs === DesktopOS.MacOS) {
    isMacOS = true;
  }

  return (
    <StyledSubmitRow>
      <TooltipWrapper
        onClick={_onSubmit}
        shortcut={
          <Text size="s" style={{ display: "flex", alignItems: "center" }}>
            {isMacOS ? <Command size={14} /> : <WindowsLogo size={14} />} +
            Enter
          </Text>
        }
        description="Save event"
      >
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
