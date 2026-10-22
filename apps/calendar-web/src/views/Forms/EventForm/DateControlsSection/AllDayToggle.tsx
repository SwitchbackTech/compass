import { EVENT_FORM_TOGGLE_ALL_DAY_KEYCAPS } from "@core/shortcuts/binding-keycaps.constants";
import {
  EventFormHintKeys,
  EventFormInfieldHint,
} from "@web/views/Forms/EventForm/EventFormFocusedHint";

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  showShortcut?: boolean;
}

export const AllDayToggle = ({
  checked,
  onChange,
  showShortcut = true,
}: Props) => (
  <label className="group/control relative flex w-fit cursor-pointer items-center gap-2 pr-16 text-sm text-text-muted">
    <input
      aria-label="All day?"
      checked={checked}
      className="c-all-day-checkbox"
      onChange={(event) => onChange(event.target.checked)}
      type="checkbox"
    />
    <span aria-hidden>All day?</span>
    {showShortcut ? (
      <EventFormInfieldHint
        className="right-0"
        testId="event-form-allday-shortcut-hint"
      >
        <EventFormHintKeys
          keys={[...EVENT_FORM_TOGGLE_ALL_DAY_KEYCAPS]}
          label="Toggle all day"
        />
      </EventFormInfieldHint>
    ) : null}
  </label>
);
