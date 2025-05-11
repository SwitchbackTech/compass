import React from "react";
import { Priority } from "@core/constants/core.constants";
import { StyledSaveBtn } from "@web/components/Button/styled";
import { StyledSubmitRow } from "../styled";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";

interface Props {
  onSubmit: () => void;
  priority: Priority;
}

export const SaveSection: React.FC<Props> = ({
  onSubmit: _onSubmit,
  priority,
}) => {
  return (
    <StyledSubmitRow>
    <TooltipWrapper onClick={_onSubmit} shortcut="⌘ + Enter" description="Save event">
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
