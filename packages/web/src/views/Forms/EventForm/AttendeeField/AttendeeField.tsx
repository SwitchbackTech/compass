import { useId, useMemo, useRef, useState } from "react";
import { type CSSObjectWithLabel, type MultiValue } from "react-select";
import CreatableSelect from "react-select/creatable";
import { type AttendeeInput } from "@core/types/event-attendance.contracts";
import { useFloatingLayer } from "@web/shortcuts/floating-layer";

/**
 * Pluggable suggestion source for the guest combobox. WP-06 plugs the
 * Google-contacts proxy in here; until then the field defaults to no
 * suggestions and is a plain email-chip input.
 */
export type AttendeeSuggestionSource = (
  query: string,
) => Promise<readonly AttendeeInput[]>;

const emptySuggestionSource: AttendeeSuggestionSource = () =>
  Promise.resolve([]);

interface AttendeeOption {
  /** Lower-cased email — react-select's identity key for chips/options. */
  value: string;
  label: string;
  attendee: AttendeeInput;
}

const toOption = (attendee: AttendeeInput): AttendeeOption => ({
  value: attendee.email.toLowerCase(),
  label: attendee.displayName ?? attendee.email,
  attendee,
});

// Pragmatic shape check, not RFC 5322: something@something.tld with no
// whitespace. The core contract only enforces length (AttendeeInputSchema),
// so this is the gate that keeps junk strings from ever becoming chips.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidAttendeeEmail = (value: string): boolean => {
  const email = value.trim();
  return email.length > 0 && email.length <= 320 && EMAIL_PATTERN.test(email);
};

const ATTENDEE_FIELD = "attendee-field";

// react-select's emotion style objects beat class-based CSS for these text
// roles — same recipe as TimePicker/FreqSelect.
const themeColor =
  (cssVar: string) =>
  (base: CSSObjectWithLabel): CSSObjectWithLabel => ({
    ...base,
    color: cssVar,
  });

const attendeeFieldStyles = {
  input: themeColor("var(--text)"),
  placeholder: themeColor("var(--text-muted)"),
  noOptionsMessage: themeColor("var(--text-muted)"),
  option: (
    base: CSSObjectWithLabel,
    { isFocused }: { isFocused: boolean },
  ): CSSObjectWithLabel => ({
    ...base,
    color: isFocused ? "var(--on-accent)" : "var(--text)",
    backgroundColor: isFocused ? "var(--accent)" : "transparent",
  }),
  multiValue: (base: CSSObjectWithLabel): CSSObjectWithLabel => ({
    ...base,
    backgroundColor: "var(--surface-raised)",
    borderRadius: "var(--radius-default)",
  }),
  multiValueLabel: themeColor("var(--text)"),
  multiValueRemove: (base: CSSObjectWithLabel): CSSObjectWithLabel => ({
    ...base,
    color: "var(--text-muted)",
    ":hover": {
      backgroundColor: "var(--error)",
      color: "var(--on-accent)",
    },
  }),
};

export interface AttendeeFieldProps {
  id?: string;
  /** Current guest chips, in the write-input shape (no responseStatus). */
  value: readonly AttendeeInput[];
  onChange: (next: readonly AttendeeInput[]) => void;
  suggestionSource?: AttendeeSuggestionSource;
}

/**
 * Email-chip combobox for the event form's guest list. Typing a valid email
 * and pressing Enter (or picking a suggestion) adds a chip; Backspace or the
 * chip's remove button drops one; invalid strings never become chips and get
 * an inline "Enter a valid email address" rejection in the listbox instead.
 * Enter/Backspace stop at the combobox (isComboboxInteraction also gates the
 * form's own shortcuts) and Escape closes the listbox before the form
 * (registered as a floating layer while open).
 */
export const AttendeeField = ({
  id,
  value,
  onChange,
  suggestionSource = emptySuggestionSource,
}: AttendeeFieldProps) => {
  const [inputValue, setInputValue] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<readonly AttendeeInput[]>([]);
  // Monotonic guard so a slow suggestion query can never clobber the results
  // of a newer one (or of a cleared input).
  const queryVersionRef = useRef(0);
  const layerId = useId();
  useFloatingLayer(`attendeeField:${layerId}`, isMenuOpen);

  const selectedOptions = useMemo(() => value.map(toOption), [value]);
  const selectedEmails = useMemo(
    () => new Set(value.map((attendee) => attendee.email.toLowerCase())),
    [value],
  );
  const options = useMemo(
    () =>
      suggestions
        .filter((entry) => !selectedEmails.has(entry.email.toLowerCase()))
        .map(toOption),
    [selectedEmails, suggestions],
  );

  const loadSuggestions = (query: string) => {
    const version = ++queryVersionRef.current;
    suggestionSource(query)
      .then((results) => {
        if (queryVersionRef.current === version) setSuggestions(results);
      })
      .catch(() => {
        if (queryVersionRef.current === version) setSuggestions([]);
      });
  };

  const closeMenu = () => {
    queryVersionRef.current += 1;
    setInputValue("");
    setSuggestions([]);
    setIsMenuOpen(false);
  };

  return (
    <div className="c-attendee-field">
      <CreatableSelect<AttendeeOption, true>
        inputId={id}
        aria-label="Guests"
        classNamePrefix={ATTENDEE_FIELD}
        styles={attendeeFieldStyles}
        isMulti
        isClearable={false}
        value={selectedOptions}
        options={options}
        inputValue={inputValue}
        menuIsOpen={isMenuOpen}
        placeholder="Add guests"
        onChange={(next: MultiValue<AttendeeOption>) => {
          onChange(next.map((option) => option.attendee));
        }}
        onInputChange={(nextInput, { action }) => {
          if (action === "input-change") {
            setInputValue(nextInput);
            const query = nextInput.trim();
            setIsMenuOpen(query.length > 0);
            if (query.length > 0) loadSuggestions(query);
            else setSuggestions([]);
            return;
          }
          // set-value (chip added), input-blur, menu-close: reset the query.
          closeMenu();
        }}
        onKeyDown={(e) => {
          const key = e.key;

          // Chip creation/removal are the combobox's own interactions —
          // never the form's Enter-to-save or Delete-event shortcuts.
          if (key === "Enter" || key === "Backspace" || key === "Delete") {
            e.stopPropagation();
          }

          // Swallow Enter whenever react-select would not consume it itself
          // (menu closed, or open with nothing selectable — e.g. an invalid
          // email showing the inline rejection): otherwise the native
          // keypress submits the surrounding form.
          if (key === "Enter") {
            const query = inputValue.trim();
            const canCreateChip =
              isValidAttendeeEmail(query) &&
              !selectedEmails.has(query.toLowerCase());
            if (!isMenuOpen || (!canCreateChip && options.length === 0)) {
              e.preventDefault();
            }
          }

          if (key === "Escape" && isMenuOpen) {
            // Close the listbox only; a second Escape (menu closed, so this
            // handler lets it bubble) reaches the form's close handler.
            closeMenu();
            e.stopPropagation();
          }
        }}
        isValidNewOption={(candidate) =>
          isValidAttendeeEmail(candidate) &&
          !selectedEmails.has(candidate.trim().toLowerCase())
        }
        getNewOptionData={(candidate) => {
          const email = candidate.trim();
          return {
            value: email.toLowerCase(),
            label: email,
            attendee: { email, displayName: null },
          };
        }}
        formatCreateLabel={(candidate) => `Add "${candidate.trim()}"`}
        noOptionsMessage={({ inputValue: query }) => {
          const email = query.trim();
          if (email.length === 0) return null;
          if (selectedEmails.has(email.toLowerCase())) {
            return `${email} is already a guest`;
          }
          return "Enter a valid email address";
        }}
        createOptionPosition="first"
        tabSelectsValue={false}
      />
    </div>
  );
};
