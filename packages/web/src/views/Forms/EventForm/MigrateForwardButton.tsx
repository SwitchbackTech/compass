import React from "react";
import styled from "styled-components";
import { getMetaKey } from "@web/common/utils/shortcut.util";
import { Text } from "@web/components/Text";
import TooltipIconButton from "@web/components/TooltipIconButton/TooltipIconButton";

const StyledMigrateForwardButton = styled.div`
  font-size: 25px;
  &:hover {
    cursor: pointer;
  }
`;

export const MigrateForwardButton = ({
  onClick,
  tooltipText = "Migrate Forward",
}: {
  onClick: () => void;
  tooltipText: string;
}) => {
  return (
    <TooltipIconButton
      component={
        <StyledMigrateForwardButton id="migrate-forward-button" role="button">
          {">"}
        </StyledMigrateForwardButton>
      }
      buttonProps={{ "aria-label": tooltipText }}
      tooltipProps={{
        description: tooltipText,
        onClick,
        shortcut: (
          <Text size="s" style={{ display: "flex", alignItems: "center" }}>
            Ctrl + {getMetaKey()} + Right
          </Text>
        ),
      }}
    />
  );
};
