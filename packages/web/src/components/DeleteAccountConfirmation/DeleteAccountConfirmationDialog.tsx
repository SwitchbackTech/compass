import { useId, useState } from "react";
import {
  OverlayPanel,
  OverlayPanelActionButton,
  OverlayPanelActions,
} from "@web/components/OverlayPanel/OverlayPanel";

export const DELETE_ACCOUNT_PHRASE = "Delete my Compass account";

const INTRO_TEXT = [
  "This deletes your Compass account and everything Compass stores for you — your calendars, events, and settings. It can't be undone.",
  "Your Google Calendar is not affected. Nothing there gets deleted, and Compass just loses its access to it.",
].join("\n\n");

interface DeleteAccountConfirmationDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteAccountConfirmationDialog({
  isOpen,
  onCancel,
  onConfirm,
}: DeleteAccountConfirmationDialogProps) {
  const [typedPhrase, setTypedPhrase] = useState("");
  const inputId = useId();

  if (!isOpen) return null;

  return (
    <OverlayPanel
      title="Delete your Compass account?"
      message={INTRO_TEXT}
      onDismiss={onCancel}
      align="start"
      variant="modal"
      widthClassName="w-[480px]"
    >
      <div className="flex w-full flex-col gap-2">
        <label htmlFor={inputId} className="text-sm text-text">
          Type <span className="text-text-muted">{DELETE_ACCOUNT_PHRASE}</span>{" "}
          to confirm
        </label>
        <input
          id={inputId}
          type="text"
          value={typedPhrase}
          autoComplete="off"
          className="w-full rounded border border-border bg-transparent px-3 py-2 text-text outline-none placeholder:text-text-muted focus-visible:border-accent"
          onChange={(event) => setTypedPhrase(event.target.value)}
          // Typing the phrase out is the whole point of the confirmation,
          // so it can't be pasted or dragged in.
          onPaste={(event) => event.preventDefault()}
          onDrop={(event) => event.preventDefault()}
        />
      </div>

      <OverlayPanelActions align="start">
        <OverlayPanelActionButton
          variant="destructive"
          disabled={typedPhrase !== DELETE_ACCOUNT_PHRASE}
          onClick={onConfirm}
        >
          Delete account
        </OverlayPanelActionButton>
        <OverlayPanelActionButton onClick={onCancel}>
          Cancel
        </OverlayPanelActionButton>
      </OverlayPanelActions>
    </OverlayPanel>
  );
}
