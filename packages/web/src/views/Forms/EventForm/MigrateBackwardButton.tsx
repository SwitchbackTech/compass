import React from "react";
import styled from "styled-components";
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
      }}
    />
  );
};
