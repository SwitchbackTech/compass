import { XIcon } from "@phosphor-icons/react";
import { useMemo, useRef } from "react";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";
import { Btn } from "@web/components/Button/Button";
import { timezoneDialogActions } from "@web/timezone/timezone-dialog.store";
import {
  availabilityActions,
  useAvailabilityStore,
} from "./availability.store";
import { formatAvailabilityMessage } from "./availability-message.util";

const EMPTY_MESSAGE = "Select times on the calendar to build your message.";

export function AvailabilityPanel() {
  const state = useAvailabilityStore();
  const previewRef = useRef<HTMLDivElement>(null);
  const selected = state.slots.filter(
    (slot) => slot.selected && new Date(slot.start).getTime() >= Date.now(),
  );
  const message = useMemo(
    () =>
      selected.length
        ? formatAvailabilityMessage({
            slots: selected,
            sourceTimeZone: state.sourceZone,
            recipientTimeZone: state.recipientZone ?? undefined,
          })
        : "",
    [selected, state.recipientZone, state.sourceZone],
  );

  const copy = async () => {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      availabilityActions.markCopied();
      showStatusToast("availability-copied", "Copied slots to clipboard.");
    } catch {
      showStatusToast(
        "availability-copy-failed",
        "Couldn’t copy availability. Select the message and copy it manually.",
      );
      previewRef.current?.focus();
      const selection = window.getSelection();
      if (selection && previewRef.current) {
        const range = document.createRange();
        range.selectNodeContents(previewRef.current);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  };

  return (
    <section
      aria-label="Share availability"
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex items-center justify-between px-4 pb-3">
        <h2 className="font-semibold text-base">Share availability</h2>
        <Btn
          aria-label="Close share availability"
          className="h-8 w-8 text-text-muted"
          onClick={availabilityActions.close}
        >
          <XIcon aria-hidden size={16} />
        </Btn>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4">
        <section
          aria-label="Availability message preview"
          className="select-text whitespace-pre-wrap rounded border border-border bg-surface-overlay p-3 text-sm text-text"
          ref={previewRef}
          tabIndex={-1}
        >
          {message || EMPTY_MESSAGE}
        </section>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-accent-secondary px-2 py-1">
            {state.sourceZone}
          </span>
          {state.recipientZone ? (
            <button
              className="c-focus-ring rounded-full bg-accent-secondary px-2 py-1"
              onClick={() => availabilityActions.setRecipientZone(null)}
              type="button"
            >
              {state.recipientZone} ×
            </button>
          ) : (
            <button
              className="c-focus-ring text-text-muted underline"
              onClick={() =>
                timezoneDialogActions.open(
                  undefined,
                  "availability-recipient",
                  availabilityActions.setRecipientZone,
                )
              }
              type="button"
            >
              Add recipient timezone (Z)
            </button>
          )}
        </div>
        <p className="text-text-muted text-xs">
          Arrow keys move · Enter or Space toggles · drag to add
        </p>
      </div>
      <div className="sticky bottom-0 border-border border-t bg-surface-panel p-4">
        <Btn
          aria-label="Copy availability to clipboard"
          className="w-full bg-accent-primary px-3 py-2 font-medium text-background text-sm disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!message}
          onClick={() => void copy()}
        >
          {message ? "Copy to clipboard  ·  Mod C" : "Select a time to copy"}
        </Btn>
      </div>
    </section>
  );
}
