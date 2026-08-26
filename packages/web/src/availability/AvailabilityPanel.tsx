import { XIcon } from "@phosphor-icons/react";
import { useMemo, useRef } from "react";
import { track } from "@web/auth/posthog/track";
import { showStatusToast } from "@web/common/utils/toast/status-toast.util";
import { Btn } from "@web/components/Button/Button";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";
import { ShortcutTipParts } from "@web/shortcuts/tips/ShortcutTipParts";
import { timezoneDialogActions } from "@web/timezone/timezone-dialog.store";
import {
  availabilityActions,
  getAvailabilityPicks,
  useAvailabilityStore,
} from "./availability.store";
import {
  AVAILABILITY_ACCEPT_HINT_PARTS,
  AVAILABILITY_COUNT_HINT_PARTS,
  AVAILABILITY_MOVE_HINT_PARTS,
} from "./availability-hint.parts";
import { formatAvailabilityMessage } from "./availability-message.util";
import { COPY_AVAILABILITY_LABEL } from "./availability-slot.focus";

// Shown in Week and Day alike, so it must not name a period the user is not
// looking at.
const EMPTY_MESSAGE = "No free times left in view. Try a later date.";

const openRecipientPicker = () =>
  timezoneDialogActions.open(
    undefined,
    "availability-recipient",
    availabilityActions.setRecipientZone,
  );

export function AvailabilityPanel() {
  const state = useAvailabilityStore();
  const previewRef = useRef<HTMLDivElement>(null);
  const { pickIds, slots } = state;
  const selected = useMemo(
    () =>
      getAvailabilityPicks({ pickIds, slots }).filter(
        (slot) => new Date(slot.start).getTime() >= Date.now(),
      ),
    [pickIds, slots],
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
      track("availability_copied", {
        slot_count: String(selected.length),
        has_recipient_zone: String(Boolean(state.recipientZone)),
      });
      showStatusToast("availability-copied", "Copied slots to clipboard.");
    } catch {
      track("availability_copy_failed", { reason_category: "clipboard" });
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
        <div aria-live="polite" className="sr-only">
          {state.announcement}
        </div>
        {state.status === "loading" ? <p>Checking your calendars…</p> : null}
        {state.status === "error" ? (
          <p role="alert">Availability couldn’t be checked. Try again.</p>
        ) : null}
        <section
          aria-label="Availability message preview"
          className="select-text whitespace-pre-wrap rounded border border-border bg-surface-overlay p-3 text-sm text-text"
          ref={previewRef}
          tabIndex={-1}
        >
          {message || EMPTY_MESSAGE}
        </section>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-border bg-surface-overlay px-2 py-1 text-text">
            {state.sourceZone}
          </span>
          {state.recipientZone ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-overlay px-2 py-1 text-text">
              {state.recipientZone}
              <Btn
                aria-label="Remove recipient timezone"
                className="h-4 w-4 text-text-muted"
                onClick={() => availabilityActions.setRecipientZone(null)}
              >
                <XIcon aria-hidden size={12} />
              </Btn>
              <ShortcutKeys keys={["Shift", "Z"]} />
            </span>
          ) : (
            <button
              className="c-focus-ring inline-flex items-center gap-1.5 rounded-full px-1 text-text-muted"
              onClick={openRecipientPicker}
              type="button"
            >
              Add recipient timezone
              <ShortcutKeys keys={["Z"]} />
            </button>
          )}
        </div>
        {/*
          ShortcutTipParts nests its chips in an aria-hidden span and aligns
          them to the text baseline, which reads as "off-centre" next to
          lower-case prose. Laying that inner span out as a centred flex row
          puts the keycap and its words on a shared centre line.
        */}
        <div className="flex flex-col gap-2 text-text-muted text-xs [&>span>span]:flex [&>span>span]:flex-wrap [&>span>span]:items-center [&>span>span]:gap-x-1">
          <ShortcutTipParts parts={AVAILABILITY_MOVE_HINT_PARTS} />
          <ShortcutTipParts parts={AVAILABILITY_ACCEPT_HINT_PARTS} />
          <ShortcutTipParts parts={AVAILABILITY_COUNT_HINT_PARTS} />
        </div>
      </div>
      <div className="sticky bottom-0 border-border border-t bg-surface-panel p-4">
        <Btn
          aria-label={COPY_AVAILABILITY_LABEL}
          className="w-full gap-2 rounded-sm bg-accent px-3 py-2 font-medium text-on-accent text-sm hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!message || state.status !== "ready"}
          onClick={() => void copy()}
        >
          {message ? (
            <>
              Copy to clipboard
              <ShortcutKeys keys={["Mod", "C"]} />
            </>
          ) : (
            "Nothing to copy"
          )}
        </Btn>
      </div>
    </section>
  );
}
