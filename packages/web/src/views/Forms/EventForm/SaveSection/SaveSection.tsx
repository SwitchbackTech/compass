import type React from "react";
import { useCallback } from "react";
import { type Priority } from "@core/constants/core.constants";
import { Btn, SaveButton } from "@web/components/Button/Button";
import { Flex } from "@web/components/Flex/Flex";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";

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
  const onSave = useCallback(() => _onSubmit(), [_onSubmit]);

  return (
    <Flex className="justify-end pt-[18px]">
      {onCancel && (
        <TooltipWrapper onClick={onCancel} description={cancelText}>
          <Btn
            role="button"
            tabIndex={0}
            title={cancelText}
            style={{ marginRight: 18 }}
          >
            {cancelText}
          </Btn>
        </TooltipWrapper>
      )}

      <TooltipWrapper onClick={onSave} shortcut={["Mod", "Enter"]}>
        <SaveButton
          minWidth={110}
          priority={priority!}
          role="button"
          tabIndex={0}
          aria-keyshortcuts="Meta+Enter"
        >
          {saveText}
        </SaveButton>
      </TooltipWrapper>
    </Flex>
  );
};
