import {
  OverlayPanel,
  OverlayPanelActionButton,
  OverlayPanelActions,
} from "@web/components/OverlayPanel/OverlayPanel";

interface LogoutConfirmationDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function LogoutConfirmationDialog({
  isOpen,
  onCancel,
  onConfirm,
}: LogoutConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <OverlayPanel
      title="Log out?"
      message="You'll lose access to your calendar data."
      onDismiss={onCancel}
      variant="modal"
    >
      <OverlayPanelActions>
        <OverlayPanelActionButton onClick={onCancel}>
          Cancel
        </OverlayPanelActionButton>
        <OverlayPanelActionButton variant="primary" onClick={onConfirm}>
          Log out
        </OverlayPanelActionButton>
      </OverlayPanelActions>
    </OverlayPanel>
  );
}
