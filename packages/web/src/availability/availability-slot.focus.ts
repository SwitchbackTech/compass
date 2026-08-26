/**
 * Focus for the availability picks on the grid, following the same
 * querySelector + rAF-retry shape as `focusCalendarEventElement`
 * (common/utils/event/event.util.ts): the pick only mounts once the events
 * query resolves and `status` flips to "ready", so the first attempt after
 * pressing `a` routinely runs before the node exists.
 */

const MAX_ATTEMPTS = 30;

export const AVAILABILITY_SLOT_ATTRIBUTE = "data-availability-slot";

export const availabilitySlotSelector = (slotId: string) =>
  `[${AVAILABILITY_SLOT_ATTRIBUTE}="${CSS.escape(slotId)}"]`;

/**
 * Focuses a pick, scrolling it into view first so a pick repositioned outside
 * the visible hours is not focused off-screen. `isStale` lets the caller abort
 * the retry loop when the panel closes or the active pick changes again, so a
 * pending loop can never steal focus back.
 */
export const focusAvailabilitySlot = (
  slotId: string,
  isStale: () => boolean = () => false,
) => {
  let attempts = 0;

  const tryFocus = () => {
    if (isStale()) return;
    const element = document.querySelector<HTMLElement>(
      availabilitySlotSelector(slotId),
    );
    if (element) {
      element.scrollIntoView({ block: "nearest" });
      element.focus();
      return;
    }
    if (++attempts < MAX_ATTEMPTS) requestAnimationFrame(tryFocus);
  };

  tryFocus();
};

export const COPY_AVAILABILITY_LABEL = "Copy availability to clipboard";

/** Where focus lands once the last pick is accepted. */
export const focusCopyAvailabilityButton = () => {
  document
    .querySelector<HTMLButtonElement>(
      `[aria-label="${COPY_AVAILABILITY_LABEL}"]`,
    )
    ?.focus();
};
