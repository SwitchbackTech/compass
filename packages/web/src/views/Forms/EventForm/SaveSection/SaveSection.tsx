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
    // Pinned footer bar: EventForm renders this outside its scrollable body,
    // so it stays visible while the fields scroll.
    <div className="flex items-center justify-start gap-3 border-border border-t px-4 py-3">
      {onCancel && (
        <TooltipWrapper onClick={onCancel} description={cancelText}>
          <Btn title={cancelText}>{cancelText}</Btn>
        </TooltipWrapper>
      )}

      <TooltipWrapper onClick={onSave} shortcut={["Mod", "Enter"]}>
        <SaveButton minWidth={110} aria-keyshortcuts="Meta+Enter">
          {saveText}
        </SaveButton>
      </TooltipWrapper>
    </div>
  );
};
