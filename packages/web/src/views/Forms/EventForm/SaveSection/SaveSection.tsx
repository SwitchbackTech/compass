import type React from "react";
import { useCallback } from "react";
import { type Priority } from "@core/constants/core.constants";
import { Btn, SaveButton } from "@web/components/Button/Button";
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
  const handleActivate =
    (action: () => void) => (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      e.stopPropagation();
      action();
    };

  return (
    <div className="flex items-start justify-end pt-[18px]">
      {onCancel && (
        <TooltipWrapper description={cancelText}>
          <Btn
            onClick={onCancel}
            onKeyDown={handleActivate(onCancel)}
            role="button"
             tabIndex={0}
            title={cancelText}
            style={{ marginRight: 18 }}
          >
            {cancelText}
          </Btn>
        </TooltipWrapper>
      )}

      <TooltipWrapper shortcut={["Mod", "Enter"]}>
        <SaveButton
          minWidth={110}
          priority={priority!}
          onClick={onSave}
          onKeyDown={handleActivate(onSave)}
          role="button"
          tabIndex={0}
          aria-keyshortcuts="Meta+Enter Control+Enter"
        >
          {saveText}
        </SaveButton>
      </TooltipWrapper>
    </div>
  );
};
