import { type KeyboardEvent, useEffect, useMemo, useRef } from "react";
import { getBusyPeriodPosition } from "@web/grid/layout/event.position";
import {
  type GridMeasurements,
  type GridVisibleDate,
} from "@web/grid/types/grid.types";
import { AvailabilitySlotBlock } from "./AvailabilitySlotBlock";
import {
  availabilityActions,
  getActivePickId,
  getAvailabilityPicks,
  useAvailabilityStore,
} from "./availability.store";
import {
  focusAvailabilitySlot,
  focusCopyAvailabilityButton,
} from "./availability-slot.focus";

const ID_AVAILABILITY_SLOTS = "availabilitySlots";

interface Props {
  measurements: GridMeasurements;
  visibleDates: GridVisibleDate[];
  /**
   * Day view columns are calendars, not days, so a pick spans the whole day
   * rather than one calendar's column.
   */
  columnIndex?: number;
}

const timeLabel = (slot: { start: string; end: string }, zone: string) => {
  const format = new Intl.DateTimeFormat(undefined, {
    timeZone: zone,
    hour: "numeric",
    minute: "2-digit",
  });
  return `${format.format(new Date(slot.start))} – ${format.format(new Date(slot.end))}`;
};

const slotName = (
  slot: { start: string; end: string },
  zone: string,
  index: number,
  total: number,
  isAccepted: boolean,
) =>
  `Time ${index + 1} of ${total}, ${new Intl.DateTimeFormat(undefined, {
    timeZone: zone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(slot.start))}, ${timeLabel(slot, zone)}${
    isAccepted ? ", accepted" : ""
  }`;

/**
 * The offered times, drawn on the timed grid. Only the picks render - the free
 * blocks behind them stay invisible, so the grid shows the offer rather than a
 * field of candidates to hunt through.
 *
 * Movement keys are handled here rather than as global `useAppShortcut`
 * registrations because DOM focus sits on a pick: Enter and Space would
 * otherwise both fire the handler and activate the button.
 */
export function AvailabilityGridOverlay({
  columnIndex,
  measurements,
  visibleDates,
}: Props) {
  const {
    acceptedIds,
    activePickIndex,
    isOpen,
    pickIds,
    slots,
    sourceZone,
    status,
  } = useAvailabilityStore();
  // Derived here rather than through a store selector: both build a new array
  // each call, and a selector that does that re-renders forever.
  const picks = useMemo(
    () => getAvailabilityPicks({ pickIds, slots }),
    [pickIds, slots],
  );
  const activeId = getActivePickId({ activePickIndex, pickIds });
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  const isReady = isOpen && status === "ready";

  useEffect(() => {
    if (!isReady || !activeId) return;
    focusAvailabilitySlot(activeId, () => activeIdRef.current !== activeId);
  }, [activeId, isReady]);

  if (!isOpen || status === "error") return null;
  if (status === "loading")
    return (
      <div
        aria-label="Checking availability"
        className="pointer-events-none absolute inset-0 animate-pulse bg-surface-overlay"
        role="status"
      />
    );

  const runKey = (event: KeyboardEvent<HTMLDivElement>): boolean => {
    switch (event.key) {
      case "ArrowUp":
        availabilityActions.movePickByTime(-1);
        return true;
      case "ArrowDown":
        availabilityActions.movePickByTime(1);
        return true;
      case "ArrowLeft":
        availabilityActions.movePickByDay(-1);
        return true;
      case "ArrowRight":
        availabilityActions.movePickByDay(1);
        return true;
      case "Enter":
        if (availabilityActions.acceptPick()) focusCopyAvailabilityButton();
        return true;
      case "Tab":
        availabilityActions.focusPick(event.shiftKey ? -1 : 1);
        return true;
      case "a":
      case "A":
        availabilityActions.addPick();
        return true;
      case "Backspace":
      case "Delete":
        availabilityActions.removePick();
        return true;
      default:
        return false;
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!runKey(event)) return;
    // Only swallow keys we acted on, so Escape and Mod+C still reach their
    // global handlers.
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      aria-label="Offered times"
      id={ID_AVAILABILITY_SLOTS}
      onKeyDown={onKeyDown}
      role="listbox"
    >
      {picks.map((slot, index) => {
        const position = getBusyPeriodPosition(slot, {
          columnIndex,
          measurements,
          visibleDates,
        });
        const isAccepted = acceptedIds.includes(slot.id);
        return (
          <AvailabilitySlotBlock
            ariaLabel={slotName(
              slot,
              sourceZone,
              index,
              picks.length,
              isAccepted,
            )}
            isAccepted={isAccepted}
            isActive={index === activePickIndex}
            key={slot.id}
            position={position}
            slotId={slot.id}
            timeLabel={timeLabel(slot, sourceZone)}
          />
        );
      })}
    </div>
  );
}
