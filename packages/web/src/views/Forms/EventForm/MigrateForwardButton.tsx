import React from "react";
import styled from "styled-components";
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
        <StyledMigrateForwardButton role="button">
          {">"}
        </StyledMigrateForwardButton>
      }
      buttonProps={{ "aria-label": tooltipText }}
      tooltipProps={{
        description: tooltipText,
        onClick,
      }}
    />
  );
};
