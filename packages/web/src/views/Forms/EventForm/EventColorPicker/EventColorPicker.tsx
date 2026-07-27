import {
  type EventColorSlot,
  EventColorSlotSchema,
} from "@core/types/event-color.contracts";
import { EVENT_COLOR_SLOT_HEX } from "@web/common/styles/theme.util";

const COLOR_SLOTS = EventColorSlotSchema.options;

export interface EventColorPickerProps {
  value: EventColorSlot | null;
  onChange: (color: EventColorSlot | null) => void;
}

const swatchClassName =
  "h-5 w-5 cursor-pointer appearance-none rounded-sm border border-transparent checked:border-text checked:outline checked:outline-2 checked:outline-offset-1 checked:outline-text focus-visible:ring-2 focus-visible:ring-accent";

export const EventColorPicker = ({
  value,
  onChange,
}: EventColorPickerProps) => (
  <fieldset className="m-0 min-w-0 border-0 p-0">
    <legend className="sr-only">Event color</legend>
    <div className="flex flex-wrap items-center gap-1.5">
      <input
        type="radio"
        name="event-color"
        checked={value === null}
        aria-label="Calendar default color"
        className={`${swatchClassName} border-border bg-bg-primary`}
        onChange={() => onChange(null)}
      />
      {COLOR_SLOTS.map((slot) => (
        <input
          key={slot}
          type="radio"
          name="event-color"
          checked={value === slot}
          aria-label={slot}
          className={swatchClassName}
          style={{ backgroundColor: EVENT_COLOR_SLOT_HEX[slot] }}
          onChange={() => onChange(slot)}
        />
      ))}
    </div>
  </fieldset>
);
