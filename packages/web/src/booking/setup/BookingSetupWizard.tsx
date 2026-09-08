import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
} from "react";
import {
  type SetupStep,
  type SetupStepId,
} from "@web/booking/setup/setup-steps";
import { isEditableKeyboardTarget } from "@web/common/utils/form/form.util";
import {
  OverlayPanelActionButton,
  OverlayPanelActions,
} from "@web/components/OverlayPanel/OverlayPanel";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";
import { settingsShortcutAttrs } from "@web/settings/useSettingsShortcuts";

interface BookingSetupWizardProps {
  children: ReactNode;
  continueLabel: string;
  error: string | null;
  isPending: boolean;
  onBack: () => void;
  onContinue: () => void;
  step: SetupStep;
  steps: readonly SetupStep[];
}

const isTextInputTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLInputElement)) return false;
  return (
    target.type === "text" || target.type === "search" || target.type === ""
  );
};

const isContinueButton = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return target.closest('[data-settings-shortcut="save-booking"]') != null;
};

export function BookingSetupWizard({
  children,
  continueLabel,
  error,
  isPending,
  onBack,
  onContinue,
  step,
  steps,
}: BookingSetupWizardProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const index = steps.findIndex((entry) => entry.id === step.id);
  const stepNumber = index < 0 ? 1 : index + 1;
  const stepCount = steps.length;

  useEffect(() => {
    const body = bodyRef.current;
    const first =
      body?.querySelector<HTMLElement>(
        'input, select, [role="radio"][tabindex="0"], button:not([disabled])',
      ) ??
      document.querySelector<HTMLElement>(
        '[data-settings-shortcut="save-booking"]',
      );
    first?.focus();
  }, [step.id]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (key === "k" && !isEditableKeyboardTarget(event)) {
      event.preventDefault();
      onContinue();
      return;
    }
    if (key === "j" && !isEditableKeyboardTarget(event)) {
      event.preventDefault();
      onBack();
      return;
    }
    if (event.key === "Enter") {
      if (isContinueButton(event.target)) return;
      if (isTextInputTarget(event.target)) {
        event.preventDefault();
        onContinue();
      }
    }
  };

  return (
    <div className="flex flex-col gap-4" onKeyDown={handleKeyDown}>
      <p aria-live="polite" className="text-text-muted text-sm">
        {`Step ${stepNumber} of ${stepCount}`}
      </p>
      <div className="flex flex-col gap-2">
        <h2 className="font-medium text-lg text-text">{step.title}</h2>
        <p className="text-sm text-text">{step.sentence}</p>
      </div>
      <div className="flex flex-col gap-2" ref={bodyRef}>
        {children}
      </div>
      {error && step.id !== "live" ? (
        <p className="font-medium text-sm text-text" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <OverlayPanelActions align="start">
          <OverlayPanelActionButton
            aria-busy={isPending || undefined}
            aria-keyshortcuts="Meta+Enter Control+Enter"
            disabled={isPending}
            onClick={onContinue}
            shortcut={["Enter"]}
            showShortcut
            variant="primary"
            {...settingsShortcutAttrs("save-booking")}
          >
            {continueLabel}
          </OverlayPanelActionButton>
        </OverlayPanelActions>
        <span className="inline-flex items-center gap-1 text-sm text-text-muted">
          <ShortcutKeys keys="Escape" />
          Back
        </span>
        <ShortcutKeys keys="J" />
        <ShortcutKeys keys="K" />
      </div>
    </div>
  );
}

export function setupContinueLabel(stepId: SetupStepId): string {
  return stepId === "live" ? "Turn on and copy link" : "Continue";
}
