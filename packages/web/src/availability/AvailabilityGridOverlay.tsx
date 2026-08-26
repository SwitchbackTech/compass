import {
  availabilityActions,
  useAvailabilityStore,
} from "./availability.store";

export function AvailabilityGridOverlay() {
  const { activeId, isOpen, slots, sourceZone } = useAvailabilityStore();
  if (!isOpen) return null;
  return (
    <div
      aria-label="Availability times"
      aria-multiselectable="true"
      className="pointer-events-none absolute inset-0 z-10"
      role="listbox"
    >
      <div className="pointer-events-auto absolute right-2 bottom-2 flex max-h-[45%] w-56 flex-col gap-1 overflow-auto rounded border border-border bg-surface-panel/95 p-2 shadow-lg">
        {slots.map((slot) => {
          const label = `${new Intl.DateTimeFormat(undefined, { timeZone: sourceZone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(slot.start))}, ${slot.selected ? "selected" : "not selected"}`;
          return (
            <button
              aria-label={label}
              aria-selected={slot.selected}
              className={`c-focus-ring rounded px-2 py-1 text-left text-xs ${slot.selected ? "bg-accent-primary text-background" : "bg-accent-secondary text-text"} ${activeId === slot.id ? "ring-2 ring-text" : ""}`}
              key={slot.id}
              onClick={() => availabilityActions.toggle(slot.id)}
              role="option"
              type="button"
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
