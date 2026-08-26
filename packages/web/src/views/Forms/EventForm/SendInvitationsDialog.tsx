import { useRef } from "react";
import {
  OverlayPanel,
  OverlayPanelActionButton,
  OverlayPanelActions,
} from "@web/components/OverlayPanel/OverlayPanel";
import { type EventInvitationPrompt } from "@web/views/Forms/hooks/useSaveEventForm";

type SendInvitationsDialogProps = {
  prompt: EventInvitationPrompt;
};

/**
 * Save-time "Send invitation emails?" choice, shown only when a save changed
 * the guest set. Send (the default, focused on open) has Google email the
 * affected guests (`invitation: "all"`); Don't send saves silently
 * (`"none"`). Dismissing (Escape / backdrop) cancels the save and returns to
 * the form. Compass never sends email itself — Google does, via sendUpdates.
 */
export function SendInvitationsDialog({ prompt }: SendInvitationsDialogProps) {
  const sendButtonRef = useRef<HTMLButtonElement>(null);

  if (!prompt) return null;

  return (
    <OverlayPanel
      title="Send invitation emails?"
      message="Google will email the affected guests about this event."
      onDismiss={prompt.onCancel}
      initialFocusRef={sendButtonRef}
      variant="modal"
    >
      <OverlayPanelActions>
        <OverlayPanelActionButton onClick={prompt.onDontSend}>
          Don't send
        </OverlayPanelActionButton>
        <OverlayPanelActionButton
          ref={sendButtonRef}
          variant="primary"
          onClick={prompt.onSend}
        >
          Send
        </OverlayPanelActionButton>
      </OverlayPanelActions>
    </OverlayPanel>
  );
}
