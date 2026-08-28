import {
  OverlayPanel,
  OverlayPanelActionButton,
  OverlayPanelActions,
} from "@web/components/OverlayPanel/OverlayPanel";

interface UpgradeConfirmationDialogProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onManageBilling: () => void;
}

/**
 * Confirms starting a Stripe subscription before the trial runs out. No amount
 * is shown here on purpose: the price lives on the Stripe Price, not in this
 * codebase, so operators can change it without a web deploy. "Manage billing"
 * is the way to see the card and the exact charge before committing, so it sits
 * apart from the two real choices rather than competing with them.
 */
export function UpgradeConfirmationDialog({
  isOpen,
  isSubmitting,
  onCancel,
  onConfirm,
  onManageBilling,
}: UpgradeConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <OverlayPanel
      title="Start Premium now?"
      message="Premium starts right away and the card on file is charged today. Everything in your calendar keeps working, and the trial badge goes away."
      onDismiss={onCancel}
      align="start"
      variant="modal"
    >
      <div className="flex w-full flex-col items-start gap-4">
        <OverlayPanelActions align="start">
          <OverlayPanelActionButton
            variant="primary"
            shortcut="Enter"
            disabled={isSubmitting}
            onClick={onConfirm}
          >
            {isSubmitting ? "Starting Premium…" : "Start Premium"}
          </OverlayPanelActionButton>
          <OverlayPanelActionButton
            shortcut="Esc"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            Cancel
          </OverlayPanelActionButton>
        </OverlayPanelActions>
        <OverlayPanelActionButton
          variant="ghost"
          disabled={isSubmitting}
          onClick={onManageBilling}
        >
          Manage billing
        </OverlayPanelActionButton>
      </div>
    </OverlayPanel>
  );
}
