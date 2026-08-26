import { useState } from "react";
import { type RsvpEventInput } from "@core/types/event-command.contracts";
import {
  OverlayPanel,
  OverlayPanelActionButton,
  OverlayPanelActions,
} from "@web/components/OverlayPanel/OverlayPanel";
import {
  radioDotClassName,
  selectedUpdateScopeOptionClassName,
  updateScopeOptionClassName,
} from "@web/views/Forms/EventForm/RecurrenceScopeDialog";

type RsvpScope = RsvpEventInput["scope"];

// The per-occurrence choice for answering a recurring invitation
// (RecurrenceScopeDialog pattern, product decision 3). Deliberately only
// "This Event" / "All Events": an RSVP has no this-and-following semantics —
// sync refuses that scope typed, so this dialog must never offer it.
const RSVP_SCOPE_OPTIONS: ReadonlyArray<{ value: RsvpScope; label: string }> = [
  { value: "single", label: "This Event" },
  { value: "all", label: "All Events" },
];

interface RsvpScopeDialogProps {
  onCancel: () => void;
  onConfirm: (scope: RsvpScope) => void;
}

export function RsvpScopeDialog({ onCancel, onConfirm }: RsvpScopeDialogProps) {
  const [selectedScope, setSelectedScope] = useState<RsvpScope>("single");

  return (
    <OverlayPanel title="Respond for" onDismiss={onCancel} variant="modal">
      <div
        role="radiogroup"
        aria-label="Respond for"
        className="flex w-full flex-col gap-1"
      >
        {RSVP_SCOPE_OPTIONS.map(({ value, label }) => {
          const isSelected = selectedScope === value;

          return (
            <label
              key={value}
              className={`${updateScopeOptionClassName} ${
                isSelected ? selectedUpdateScopeOptionClassName : ""
              }`}
            >
              <input
                type="radio"
                name="rsvp-scope"
                value={value}
                checked={isSelected}
                onChange={() => setSelectedScope(value)}
                className="peer sr-only"
              />
              <span aria-hidden="true" className={radioDotClassName} />
              {label}
            </label>
          );
        })}
      </div>

      <OverlayPanelActions>
        <OverlayPanelActionButton onClick={onCancel}>
          Cancel
        </OverlayPanelActionButton>
        <OverlayPanelActionButton
          variant="primary"
          onClick={() => onConfirm(selectedScope)}
        >
          Ok
        </OverlayPanelActionButton>
      </OverlayPanelActions>
    </OverlayPanel>
  );
}
