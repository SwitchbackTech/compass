import { useRef } from "react";
import {
  availabilityActions,
  useAvailabilityStore,
} from "./availability.store";

interface Props {
  visibleDates: string[];
  hourHeight?: number;
}

const dateKey = (iso: string, zone: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));

export function AvailabilityGridOverlay({
  visibleDates,
  hourHeight = 48,
}: Props) {
  const { activeId, isOpen, slots, sourceZone, status } =
    useAvailabilityStore();
  const dragStart = useRef<string | null>(null);
  if (!isOpen) return null;
  if (status === "loading")
    return (
      <div
        aria-label="Checking availability"
        className="absolute inset-0 z-10 animate-pulse bg-surface-panel/20"
        role="status"
      />
    );
  if (status === "error") return null;
  return (
    <div
      aria-label="Availability times"
      aria-multiselectable="true"
      className="pointer-events-none absolute inset-0 z-10"
      role="listbox"
    >
      {slots.map((slot) => {
        const dayIndex = visibleDates.indexOf(dateKey(slot.start, sourceZone));
        if (dayIndex < 0) return null;
        const parts = Object.fromEntries(
          new Intl.DateTimeFormat("en-US", {
            timeZone: sourceZone,
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
          })
            .formatToParts(new Date(slot.start))
            .map(({ type, value }) => [type, value]),
        );
        const minutes = Number(parts.hour) * 60 + Number(parts.minute);
        const label = `${new Intl.DateTimeFormat(undefined, { timeZone: sourceZone, weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(slot.start))}, ${slot.selected ? "selected" : "not selected"}`;
        return (
          <button
            aria-label={label}
            aria-selected={slot.selected}
            className={`c-focus-ring pointer-events-auto absolute rounded-sm border border-accent-primary/40 text-left text-xs ${slot.selected ? "bg-accent-primary/80 text-background" : "bg-accent-secondary/50 text-text"} ${activeId === slot.id ? "ring-2 ring-text" : ""}`}
            key={slot.id}
            onClick={() => availabilityActions.toggle(slot.id)}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              dragStart.current = slot.id;
            }}
            onPointerEnter={() => {
              if (dragStart.current)
                availabilityActions.selectRange(dragStart.current, slot.id);
            }}
            onPointerUp={() => {
              if (dragStart.current)
                availabilityActions.selectRange(dragStart.current, slot.id);
              dragStart.current = null;
            }}
            role="option"
            style={{
              left: `${(dayIndex / visibleDates.length) * 100}%`,
              top: `${(minutes / 60) * hourHeight}px`,
              width: `${100 / visibleDates.length}%`,
              height: `${hourHeight / 2}px`,
            }}
            type="button"
          >
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
