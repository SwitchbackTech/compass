import {
  OverlayPanel,
  OverlayPanelActionButton,
  OverlayPanelActions,
} from "@web/components/OverlayPanel/OverlayPanel";

interface UpgradeConfirmationDialogProps {
  isOpen: boolean;
  isSubmitting: boolean;
  isOpeningPortal: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onManageBilling: () => void;
}

/**
 * Confirms starting a Stripe subscription before the trial runs out. No amount
 * is shown here on purpose: the price lives on the Stripe Price, not in this
 * codebase, so operators can change it without a web deploy. "Manage billing"
 * opens the Stripe portal (card, invoices, cancel) and does not charge today;
 * Start Premium is the only way to end the trial early.
 */
export function UpgradeConfirmationDialog({
  isOpen,
  isSubmitting,
  isOpeningPortal,
  onCancel,
  onConfirm,
  onManageBilling,
}: UpgradeConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <OverlayPanel
      title="Start Premium now?"
      message="Premium starts right away and the card on file is charged today. Everything in your calendar keeps working, and the trial badge goes away. Manage billing opens your invoices and card on file. It does not charge you or end the trial."
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
            {isSubmitting && !isOpeningPortal
              ? "Starting Premium…"
              : "Start Premium"}
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
          shortcut="M"
          disabled={isSubmitting}
          onClick={onManageBilling}
        >
          {isOpeningPortal ? "Opening Stripe…" : "Manage billing"}
        </OverlayPanelActionButton>
      </div>
    </OverlayPanel>
  );
}
