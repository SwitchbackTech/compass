import React, { useCallback } from "react";
import { Priority } from "@core/constants/core.constants";
import { getMetaKey } from "@web/common/utils/shortcut.util";
import { Btn, StyledSaveBtn } from "@web/components/Button/styled";
import { Text } from "@web/components/Text";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { StyledSubmitRow } from "../styled";

interface Props {
  saveText?: string;
  cancelText?: string;
  disableSaveBtn?: boolean;
  onSubmit: () => void;
  onCancel?: () => void;
  priority?: Priority;
}

export const SaveSection: React.FC<Props> = ({
  saveText = "Save",
  cancelText = "Cancel",
  onSubmit: _onSubmit,
  disableSaveBtn,
  onCancel,
  priority,
}) => {
  const onSave = useCallback(
    () => (disableSaveBtn ? null : _onSubmit()),
    [disableSaveBtn, _onSubmit],
  );

  return (
    <StyledSubmitRow>
      {onCancel && (
        <TooltipWrapper onClick={onCancel} description={cancelText}>
          <Btn
            role="tab"
            tabIndex={1}
            title={cancelText}
            style={{ marginRight: 18 }}
          >
            {cancelText}
          </Btn>
        </TooltipWrapper>
      )}

      <TooltipWrapper
        onClick={onSave}
        shortcut={
          <Text size="s" style={{ display: "flex", alignItems: "center" }}>
            {getMetaKey()} + Enter
          </Text>
        }
      >
        <StyledSaveBtn
          minWidth={110}
          priority={priority!}
          disabled={disableSaveBtn}
          role="tab"
          tabIndex={0}
          aria-keyshortcuts="Meta+Enter"
        >
          {saveText}
        </StyledSaveBtn>
      </TooltipWrapper>
    </StyledSubmitRow>
  );
};
