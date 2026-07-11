import {
  OverlayPanel,
  OverlayPanelActionButton,
  OverlayPanelActions,
} from "@web/components/OverlayPanel/OverlayPanel";
import { useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";

export function ConvertToStandaloneDialog() {
  const { confirmation } = useDraftContext();
  const {
    standaloneDraft,
    onConfirmConvertToStandalone,
    onCancelConvertToStandalone,
  } = confirmation;

  if (!standaloneDraft) return null;

  const eventName = standaloneDraft.values.title || "this event";

  return (
    <OverlayPanel
      title="Convert to standalone event?"
      message={`“${eventName}” will be removed from its recurring series.`}
      onDismiss={onCancelConvertToStandalone}
      variant="modal"
    >
      <OverlayPanelActions>
        <OverlayPanelActionButton onClick={onCancelConvertToStandalone}>
          Cancel
        </OverlayPanelActionButton>
        <OverlayPanelActionButton
          variant="primary"
          onClick={onConfirmConvertToStandalone}
        >
          Convert
        </OverlayPanelActionButton>
      </OverlayPanelActions>
    </OverlayPanel>
  );
}
