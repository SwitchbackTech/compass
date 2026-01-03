import React, { useEffect } from "react";
import { getModifierKey } from "@web/common/utils/shortcut/shortcut.util";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { useAppDispatch } from "@web/store/store.hooks";
import { updateOnboardingProgress } from "@web/views/Onboarding/utils/onboarding.storage.util";

interface CmdPaletteTutorialProps {
  onDismiss: () => void;
}

export const CmdPaletteTutorial: React.FC<CmdPaletteTutorialProps> = ({
  onDismiss,
}) => {
  const dispatch = useAppDispatch();
  const modifierKey = getModifierKey();
  const modifierKeyDisplay = modifierKey === "Meta" ? "⌘" : "Ctrl";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModifierPressed =
        (modifierKey === "Meta" && e.metaKey) ||
        (modifierKey === "Control" && e.ctrlKey);

      if (isModifierPressed && e.key === "k") {
        // Mark tutorial as seen when user opens cmd+k
        updateOnboardingProgress({ isSeen: true });
        dispatch(settingsSlice.actions.toggleCmdPalette());
        onDismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dispatch, modifierKey, onDismiss]);

  const handleGotIt = () => {
    updateOnboardingProgress({ isSeen: true });
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-bg-primary border-border-primary relative mx-4 max-w-lg rounded-lg border p-6 shadow-lg">
        <h2 className="text-text-light mb-4 text-xl font-semibold">
          Try the Command Palette
        </h2>
        <p className="text-text-light mb-4">
          Press{" "}
          <kbd className="bg-bg-secondary text-text-light border-border-primary rounded border px-2 py-1 font-mono text-sm">
            {modifierKeyDisplay} + K
          </kbd>{" "}
          to open the command palette. You can use it to navigate, create
          events, and access shortcuts.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleGotIt}
            className="bg-accent-primary hover:bg-accent-primary/90 rounded px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            Got it
          </button>
          <button
            onClick={() => {
              dispatch(settingsSlice.actions.toggleCmdPalette());
              handleGotIt();
            }}
            className="border-border-primary bg-bg-secondary text-text-light hover:bg-bg-tertiary rounded border px-4 py-2 text-sm font-medium transition-colors"
          >
            Open it now
          </button>
        </div>
      </div>
    </div>
  );
};
