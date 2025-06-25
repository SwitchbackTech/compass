import React from "react";
import { Priority } from "@core/constants/core.constants";
import { getMetaKey } from "@web/common/utils/shortcut.util";
import { StyledSaveBtn } from "@web/components/Button/styled";
import { Text } from "@web/components/Text";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { StyledSubmitRow } from "../styled";

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
      <TooltipWrapper
        onClick={_onSubmit}
        shortcut={
          <Text size="s" style={{ display: "flex", alignItems: "center" }}>
            {getMetaKey()} + Enter
          </Text>
        }
        description="Save event"
      >
        <StyledSaveBtn
          minWidth={110}
          priority={priority}
          role="tab"
          tabIndex={0}
          title="Save event"
        >
          Save
        </StyledSaveBtn>
      </TooltipWrapper>
    </StyledSubmitRow>
  );
};
