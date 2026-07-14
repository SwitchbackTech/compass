import type React from "react";
import { useCallback } from "react";
import { Btn, SaveButton } from "@web/components/Button/Button";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";

interface Props {
  saveText?: string;
  cancelText?: string;
  onSubmit: () => void;
  onCancel?: () => void;
}

export const SaveSection: React.FC<Props> = ({
  saveText = "Save",
  cancelText = "Cancel",
  onSubmit: _onSubmit,
  onCancel,
}) => {
  const onSave = useCallback(() => _onSubmit(), [_onSubmit]);

  return (
    <div className="flex items-start justify-end pt-[18px]">
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
          role="button"
          tabIndex={0}
          aria-keyshortcuts="Meta+Enter"
        >
          {saveText}
        </SaveButton>
      </TooltipWrapper>
    </div>
  );
};
