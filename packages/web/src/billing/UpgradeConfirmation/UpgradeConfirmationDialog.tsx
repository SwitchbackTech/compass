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
 * Confirms ending a Stripe trial early. No amount is shown here on purpose:
 * the price lives on the Stripe Price, not in this codebase, so operators can
 * change it without a web deploy. "Manage billing" is the way to see the card
 * and the exact charge before committing.
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
      title="End your trial and subscribe?"
      message="Your trial ends right away and the card on file is charged today. Your calendar keeps working, and the trial badge goes away."
      onDismiss={onCancel}
      align="start"
      variant="modal"
    >
      <OverlayPanelActions align="start">
        <OverlayPanelActionButton
          variant="primary"
          shortcut="Enter"
          disabled={isSubmitting}
          onClick={onConfirm}
        >
          {isSubmitting ? "Subscribing…" : "Subscribe now"}
        </OverlayPanelActionButton>
        <OverlayPanelActionButton
          shortcut="Esc"
          disabled={isSubmitting}
          onClick={onCancel}
        >
          Cancel
        </OverlayPanelActionButton>
        <OverlayPanelActionButton
          disabled={isSubmitting}
          onClick={onManageBilling}
        >
          Manage billing
        </OverlayPanelActionButton>
      </OverlayPanelActions>
    </OverlayPanel>
  );
}
