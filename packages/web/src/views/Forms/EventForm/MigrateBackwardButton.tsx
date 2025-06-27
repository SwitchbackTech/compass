import React from "react";
import styled from "styled-components";
import { getMetaKey } from "@web/common/utils/shortcut.util";
import { Text } from "@web/components/Text";
import TooltipIconButton from "@web/components/TooltipIconButton/TooltipIconButton";

const StyledMigrateBackwardButton = styled.div`
  font-size: 25px;
  &:hover {
    cursor: pointer;
  }
`;

export const MigrateBackwardButton = ({
  onClick,
  tooltipText = "Migrate Backward",
}: {
  onClick: () => void;
  tooltipText: string;
}) => {
  return (
    <TooltipIconButton
      component={
        <StyledMigrateBackwardButton id="migrate-backward-button" role="button">
          {"<"}
        </StyledMigrateBackwardButton>
      }
      buttonProps={{ "aria-label": tooltipText }}
      tooltipProps={{
        description: tooltipText,
        onClick,
        shortcut: (
          <Text size="s" style={{ display: "flex", alignItems: "center" }}>
            Ctrl + {getMetaKey()} + Left
          </Text>
        ),
      }}
    />
  );
};
