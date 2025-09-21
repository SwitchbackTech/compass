import React from "react";
import { Priority } from "@core/constants/core.constants";
import { getMetaKey } from "@web/common/utils/shortcut.util";
import { Btn, StyledSaveBtn } from "@web/components/Button/styled";
import { Text } from "@web/components/Text";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { StyledSubmitRow } from "../styled";

interface Props {
  saveText?: string;
  cancelText?: string;
  onSubmit: () => void;
  onCancel?: () => void;
  priority?: Priority;
}

export const SaveSection: React.FC<Props> = ({
  saveText = "Save",
  cancelText = "Cancel",
  onSubmit: _onSubmit,
  onCancel,
  priority,
}) => {
  return (
    <StyledSubmitRow>
      {onCancel && (
        <TooltipWrapper onClick={onCancel} description="Cancel">
          <Btn
            role="tab"
            tabIndex={1}
            title="Cancel"
            style={{ marginRight: 18 }}
          >
            {cancelText}
          </Btn>
        </TooltipWrapper>
      )}

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
          {saveText}
        </StyledSaveBtn>
      </TooltipWrapper>
    </StyledSubmitRow>
  );
};
