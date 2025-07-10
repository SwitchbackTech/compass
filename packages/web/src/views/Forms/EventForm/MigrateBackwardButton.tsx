import React from "react";
import styled from "styled-components";
import { ArrowLeft } from "@phosphor-icons/react";
import { getMetaKey } from "@web/common/utils/shortcut.util";
import { Text } from "@web/components/Text";
import TooltipIconButton from "@web/components/TooltipIconButton/TooltipIconButton";

const StyledMigrateBackwardButton = styled.div`
  font-size: 25px;
  &:hover {
    cursor: pointer;
  }
`;

const StyledArrowLeft = styled(ArrowLeft)`
  width: 15px;
  height: 15px;
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
            CTRL + {getMetaKey()} + <StyledArrowLeft />
          </Text>
        ),
      }}
    />
  );
};
