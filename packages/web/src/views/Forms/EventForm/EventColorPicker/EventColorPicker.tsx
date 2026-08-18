import { type ReactNode } from "react";
import {
  type EventColorSlot,
  EventColorSlotSchema,
} from "@core/types/event-color.contracts";
import {
  EVENT_COLOR_SLOT_HEX,
  eventColorLabel,
} from "@web/common/styles/theme.util";

const COLOR_SLOTS = EventColorSlotSchema.options;

export interface EventColorPickerProps {
  value: EventColorSlot | null;
  onChange: (color: EventColorSlot | null) => void;
  /** Radio group name; defaults to `event-color`. Pass a distinct value when
   * more than one picker can mount at once (e.g. form + context menu). */
  name?: string;
  id?: string;
}

const swatchClassName =
  "h-5 w-5 cursor-pointer appearance-none rounded-sm border border-transparent checked:border-text checked:outline checked:outline-2 checked:outline-offset-1 checked:outline-text focus-visible:ring-2 focus-visible:ring-accent";

const ColorSwatch = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <span className="group relative inline-flex">
    {children}
    <span className="c-context-tooltip" role="tooltip">
      {label}
    </span>
  </span>
);

export const EventColorPicker = ({
  value,
  onChange,
  name = "event-color",
  id,
}: EventColorPickerProps) => (
  <fieldset id={id} className="m-0 min-w-0 border-0 p-0">
    <legend className="sr-only">Event color</legend>
    <div className="flex flex-wrap items-center gap-1.5">
      <ColorSwatch label={eventColorLabel(null)}>
        <input
          type="radio"
          name={name}
          checked={value === null}
          aria-label={eventColorLabel(null)}
          className={`${swatchClassName} border-border bg-bg-primary`}
          onChange={() => onChange(null)}
        />
      </ColorSwatch>
      {COLOR_SLOTS.map((slot) => {
        const label = eventColorLabel(slot);
        return (
          <ColorSwatch key={slot} label={label}>
            <input
              type="radio"
              name={name}
              checked={value === slot}
              aria-label={label}
              className={swatchClassName}
              style={{ backgroundColor: EVENT_COLOR_SLOT_HEX[slot] }}
              onChange={() => onChange(slot)}
            />
          </ColorSwatch>
        );
      })}
    </div>
  </fieldset>
);
