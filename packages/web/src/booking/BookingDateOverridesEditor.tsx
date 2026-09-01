import { useEffect, useRef, useState } from "react";
import {
  type BookingDateOverride,
  type BookingDateOverrides,
} from "@core/types/booking.contracts";
import {
  formatHoursRanges,
  parseHoursRanges,
} from "@web/booking/weekly-hours.parse";

interface BookingDateOverridesEditorProps {
  value: BookingDateOverrides;
  onChange: (value: BookingDateOverrides) => void;
  onValidityChange?: (isValid: boolean) => void;
  disabled?: boolean;
}

interface DraftRow {
  key: string;
  date: string;
  kind: "blocked" | "hours";
  hoursText: string;
}

const toDrafts = (value: BookingDateOverrides): DraftRow[] =>
  value.map((override, index) => ({
    key: `${override.date}-${override.kind}-${index}`,
    date: override.date,
    kind: override.kind,
    hoursText:
      override.kind === "hours" ? formatHoursRanges(override.intervals) : "",
  }));

const parseDrafts = (
  drafts: DraftRow[],
): { ok: true; overrides: BookingDateOverride[] } | { ok: false } => {
  const overrides: BookingDateOverride[] = [];
  const seen = new Set<string>();

  for (const draft of drafts) {
    if (draft.date.trim() === "") {
      continue;
    }
    if (seen.has(draft.date)) {
      return { ok: false };
    }
    seen.add(draft.date);

    if (draft.kind === "blocked") {
      overrides.push({ kind: "blocked", date: draft.date });
      continue;
    }

    const parsed = parseHoursRanges(draft.hoursText);
    if (!parsed.ok || parsed.ranges.length === 0) {
      return { ok: false };
    }
    overrides.push({
      kind: "hours",
      date: draft.date,
      intervals: parsed.ranges,
    });
  }

  return { ok: true, overrides };
};

export function BookingDateOverridesEditor({
  value,
  onChange,
  onValidityChange,
  disabled = false,
}: BookingDateOverridesEditorProps) {
  const [drafts, setDrafts] = useState<DraftRow[]>(() => toDrafts(value));
  const parsed = parseDrafts(drafts);
  const emittedRef = useRef<BookingDateOverrides>(value);

  useEffect(() => {
    if (value === emittedRef.current) return;
    emittedRef.current = value;
    setDrafts(toDrafts(value));
    onValidityChange?.(true);
  }, [onValidityChange, value]);

  const commit = (next: DraftRow[]) => {
    setDrafts(next);
    const result = parseDrafts(next);
    onValidityChange?.(result.ok);
    if (result.ok) {
      emittedRef.current = result.overrides;
      onChange(result.overrides);
    }
  };

  const updateDraft = (key: string, patch: Partial<DraftRow>) => {
    commit(
      drafts.map((draft) =>
        draft.key === key ? { ...draft, ...patch } : draft,
      ),
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-text">Date overrides</p>
      <p className="text-text-muted text-xs">
        Block a day or replace that day's weekly hours. Extra hours replace the
        weekday template.
      </p>
      {drafts.map((draft) => (
        <div
          className="flex flex-col gap-1 sm:flex-row sm:items-center"
          key={draft.key}
        >
          <label
            className="sr-only"
            htmlFor={`booking-override-date-${draft.key}`}
          >
            Override date
          </label>
          <input
            className="c-focus-ring rounded border border-border bg-surface-overlay px-2 py-1 text-sm text-text"
            disabled={disabled}
            id={`booking-override-date-${draft.key}`}
            onChange={(event) =>
              updateDraft(draft.key, { date: event.target.value })
            }
            type="date"
            value={draft.date}
          />
          <label
            className="sr-only"
            htmlFor={`booking-override-kind-${draft.key}`}
          >
            Override kind
          </label>
          <select
            className="c-focus-ring rounded border border-border bg-surface-overlay px-2 py-1 text-sm text-text"
            disabled={disabled}
            id={`booking-override-kind-${draft.key}`}
            onChange={(event) =>
              updateDraft(draft.key, {
                kind: event.target.value as DraftRow["kind"],
              })
            }
            value={draft.kind}
          >
            <option value="blocked">Blocked</option>
            <option value="hours">Extra hours</option>
          </select>
          {draft.kind === "hours" ? (
            <>
              <label
                className="sr-only"
                htmlFor={`booking-override-hours-${draft.key}`}
              >
                Extra hours
              </label>
              <input
                aria-invalid={
                  draft.hoursText.trim() !== "" &&
                  !parseHoursRanges(draft.hoursText).ok
                    ? true
                    : undefined
                }
                className="c-focus-ring min-w-0 flex-1 rounded border border-border bg-surface-overlay px-2 py-1 text-sm text-text aria-invalid:border-error"
                disabled={disabled}
                id={`booking-override-hours-${draft.key}`}
                onChange={(event) =>
                  updateDraft(draft.key, { hoursText: event.target.value })
                }
                placeholder="9-12"
                value={draft.hoursText}
              />
            </>
          ) : null}
          <button
            className="c-focus-ring shrink-0 rounded border border-border bg-surface-overlay px-2 py-1 text-sm text-text hover:bg-surface-panel"
            disabled={disabled}
            onClick={() =>
              commit(drafts.filter((row) => row.key !== draft.key))
            }
            type="button"
          >
            Remove
          </button>
        </div>
      ))}
      {parsed.ok ? null : (
        <p className="text-error text-xs" role="alert">
          Check override dates and hours. Extra hours cannot be blank.
        </p>
      )}
      <button
        className="c-focus-ring self-start rounded border border-border bg-surface-overlay px-2 py-1 text-sm text-text hover:bg-surface-panel"
        disabled={disabled}
        onClick={() =>
          commit([
            ...drafts,
            {
              key: `new-${drafts.length}-${Date.now()}`,
              date: "",
              kind: "blocked",
              hoursText: "",
            },
          ])
        }
        type="button"
      >
        Add date override
      </button>
    </div>
  );
}
