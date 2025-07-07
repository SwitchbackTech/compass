import React from "react";
import styled from "styled-components";
import { ArrowRight } from "@phosphor-icons/react";
import { getMetaKey } from "@web/common/utils/shortcut.util";
import { Text } from "@web/components/Text";
import TooltipIconButton from "@web/components/TooltipIconButton/TooltipIconButton";

const StyledMigrateForwardButton = styled.div`
  font-size: 25px;
  &:hover {
    cursor: pointer;
  }
`;

const StyledArrowRight = styled(ArrowRight)`
  width: 15px;
  height: 15px;
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
            CTRL + {getMetaKey()} + <StyledArrowRight />
          </Text>
        ),
      }}
    />
  );
};
