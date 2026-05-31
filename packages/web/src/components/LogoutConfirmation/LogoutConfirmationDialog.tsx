import { OverlayPanel } from "@web/components/OverlayPanel/OverlayPanel";

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
      <div className="flex w-full justify-end gap-3">
        <button
          className="h-11 rounded border border-border-primary bg-panel-badge-bg px-4 text-sm text-text-lighter transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-panel-bg disabled:pointer-events-none disabled:opacity-50"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="h-11 rounded bg-accent-primary px-4 text-sm text-text-dark transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-panel-bg disabled:pointer-events-none disabled:opacity-50"
          onClick={onConfirm}
          type="button"
        >
          Log out
        </button>
      </div>
    </OverlayPanel>
  );
}
