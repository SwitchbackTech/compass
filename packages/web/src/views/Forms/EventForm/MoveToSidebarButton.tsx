import React from "react";
import { getMetaKey } from "@web/common/utils/shortcut.util";
import { Text } from "@web/components/Text";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { StyledMigrateArrowInForm } from "@web/views/Calendar/components/Sidebar/SomedayTab/SomedayEvents/SomedayEventContainer/styled";

export const MoveToSidebarButton = ({ onClick }: { onClick: () => void }) => {
  const getShortcut = () => {
    return (
      <Text size="s" style={{ display: "flex", alignItems: "center" }}>
        {getMetaKey()} +{" SHIFT "} + {","}
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
