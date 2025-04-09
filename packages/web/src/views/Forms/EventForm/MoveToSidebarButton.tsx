import React from "react";
import { DesktopOS, getDesktopOS } from "@web/common/utils/device.util";
import { StyledMigrateArrowInForm } from "@web/views/Calendar/components/Sidebar/SomedayTab/SomedayEvents/SomedayEventContainer/styled";

export const MoveToSidebarButton = ({
  onClick,
}: {
  onClick: (e: React.MouseEvent<HTMLSpanElement>) => void;
}) => {
  const getTitle = () => {
    const desktopOS = getDesktopOS();
    if (desktopOS === DesktopOS.MacOS) {
      return "Move to sidebar [⌘ + SHIFT + < ]";
    }
    return "Move to sidebar [⊞ Win + SHIFT + < ]";
  };

  return (
    <StyledMigrateArrowInForm
      onClick={onClick}
      role="button"
      title={getTitle()}
    >
      {"<"}
    </StyledMigrateArrowInForm>
  );
};
