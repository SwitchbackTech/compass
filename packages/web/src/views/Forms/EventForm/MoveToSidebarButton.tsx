import React from "react";
import { Command, WindowsLogo } from "@phosphor-icons/react";
import { DesktopOS, getDesktopOS } from "@web/common/utils/device.util";
import { Text } from "@web/components/Text";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { StyledMigrateArrowInForm } from "@web/views/Calendar/components/Sidebar/SomedayTab/SomedayEvents/SomedayEventContainer/styled";

export const MoveToSidebarButton = ({ onClick }: { onClick: () => void }) => {
  const getShortcut = () => {
    let isMacOS = false;

    const desktopOS = getDesktopOS();
    if (desktopOS === DesktopOS.MacOS) {
      isMacOS = true;
    }

    return (
      <Text size="s" style={{ display: "flex", alignItems: "center" }}>
        {isMacOS ? <Command size={14} /> : <WindowsLogo size={14} />} +
        {" SHIFT "} + {","}
      </Text>
    );
  };

  return (
    <TooltipWrapper
      onClick={onClick}
      description="Move to sidebar"
      shortcut={getShortcut()}
    >
      <StyledMigrateArrowInForm role="button">{"<"}</StyledMigrateArrowInForm>
    </TooltipWrapper>
  );
};
