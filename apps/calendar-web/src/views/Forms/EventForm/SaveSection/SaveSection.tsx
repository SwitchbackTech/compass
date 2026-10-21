import type React from "react";
import { type MouseEvent, useCallback } from "react";
import { Btn } from "@web/components/Button/Button";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { pulseClickTaughtShortcut } from "@web/shortcuts/pointer-intent/pulseClickTaughtShortcut";
import { isRealMouseClick } from "@web/shortcuts/pointer-intent/real-mouse-click";

interface Props {
  saveText?: string;
  cancelText?: string;
  onSubmit: () => void;
  onCancel?: () => void;
}

export const SaveSection: React.FC<Props> = ({
  saveText = "Save",
  cancelText = "Cancel",
  onSubmit,
  onCancel,
}) => {
  const onSaveClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (isRealMouseClick(event)) {
        pulseClickTaughtShortcut("edit-save");
      }
      onSubmit();
    },
    [onSubmit],
  );

  return (
    // Pinned footer bar: EventForm renders this outside its scrollable body,
    // so it stays visible while the fields scroll.
    <div className="flex w-full flex-col items-stretch gap-3 px-4 py-2.5">
      {onCancel && (
        <TooltipWrapper asChild description={cancelText} onClick={onCancel}>
          <Btn
            className="c-button c-button-secondary h-10 w-full justify-center rounded-xs"
            title={cancelText}
          >
            {cancelText}
          </Btn>
        </TooltipWrapper>
      )}

      <Btn
        aria-keyshortcuts="Meta+Enter Control+Enter"
        aria-label={saveText}
        className="c-button-save-bar"
        onClick={onSaveClick}
        type="button"
      >
        <span>{saveText}</span>
        <ShortcutKeys
          className="shrink-0 [&_.c-keycap]:border-on-accent/35 [&_.c-keycap]:bg-on-accent/10 [&_.c-keycap]:text-on-accent"
          keys={["Mod", "Enter"]}
        />
      </Btn>
    </div>
  );
};
