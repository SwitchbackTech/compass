import {
  type KeyboardEvent as ReactKeyboardEvent,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { getBrowserTimeZone } from "@web/common/utils/datetime/web.date.util";
import { OverlayPanel } from "@web/components/OverlayPanel/OverlayPanel";
import {
  setPinnedTimeZone,
  useEffectiveTimeZone,
  usePinnedTimeZone,
} from "@web/timezone/effective-timezone.store";
import { formatTimeZoneAbbreviation } from "@web/timezone/format-timezone-abbreviation";
import {
  buildTimeZoneList,
  filterTimeZones,
  sortTimeZonesByOffsetDistance,
} from "@web/timezone/timezone-catalog";

const AUTO_ID = "auto";

interface TimezonePickerDialogProps {
  onDismiss: () => void;
  restoreFocus?: () => void;
}

export function TimezonePickerDialog({
  onDismiss,
  restoreFocus,
}: TimezonePickerDialogProps) {
  const effectiveTimeZone = useEffectiveTimeZone();
  const pinnedTimeZone = usePinnedTimeZone();
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(pinnedTimeZone ?? AUTO_ID);
  const now = useMemo(() => new Date(), []);
  const zones = useMemo(() => {
    const list = buildTimeZoneList(now);
    const sorted = sortTimeZonesByOffsetDistance(list, effectiveTimeZone);
    return filterTimeZones(sorted, query);
  }, [effectiveTimeZone, now, query]);

  const browserZone = getBrowserTimeZone();
  const browserAbbreviation = formatTimeZoneAbbreviation(browserZone, now);
  const isAuto = pinnedTimeZone === null;
  const optionIds = [AUTO_ID, ...zones.map((zone) => zone.id)];

  const selectZone = (timeZone: string | null) => {
    setPinnedTimeZone(timeZone);
    onDismiss();
  };

  const moveActive = (delta: number) => {
    const currentIndex = optionIds.indexOf(activeId);
    const nextIndex = Math.min(
      optionIds.length - 1,
      Math.max(0, (currentIndex === -1 ? 0 : currentIndex) + delta),
    );
    setActiveId(optionIds[nextIndex] ?? AUTO_ID);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeId === AUTO_ID) {
        selectZone(null);
      } else {
        selectZone(activeId);
      }
    }
  };

  return (
    <OverlayPanel
      title="Change default timezone"
      onDismiss={onDismiss}
      restoreFocus={restoreFocus}
      initialFocusRef={searchRef}
      align="start"
      variant="modal"
      widthClassName="w-[480px]"
    >
      <div className="flex w-full flex-col gap-3">
        <input
          ref={searchRef}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-activedescendant={`${listId}-${activeId}`}
          aria-label="Search timezones"
          autoComplete="off"
          className="c-focus-ring w-full rounded border border-border bg-surface-overlay px-3 py-2 text-sm text-text outline-none placeholder:text-text-muted"
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveId(AUTO_ID);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search city, region, or abbreviation"
          type="search"
          value={query}
        />
        <div
          aria-label="Timezones"
          className="max-h-80 overflow-y-auto"
          id={listId}
          role="listbox"
        >
          <TimezoneOptionButton
            active={activeId === AUTO_ID}
            description={`Currently ${browserAbbreviation}`}
            id={`${listId}-${AUTO_ID}`}
            label={`Use browser timezone (Auto)`}
            onSelect={() => selectZone(null)}
            selected={isAuto}
          />
          {zones.map((zone) => (
            <TimezoneOptionButton
              active={activeId === zone.id}
              description={zone.secondary}
              id={`${listId}-${zone.id}`}
              key={zone.id}
              label={zone.city}
              onSelect={() => selectZone(zone.id)}
              selected={!isAuto && zone.id === effectiveTimeZone}
            />
          ))}
        </div>
      </div>
    </OverlayPanel>
  );
}

function TimezoneOptionButton({
  active,
  description,
  id,
  label,
  onSelect,
  selected,
}: {
  active: boolean;
  description: string;
  id: string;
  label: string;
  onSelect: () => void;
  selected: boolean;
}) {
  return (
    <button
      aria-selected={selected}
      className={`flex w-full flex-col items-start rounded-sm px-3 py-2 text-left text-sm ${
        active ? "bg-surface-overlay" : ""
      } ${selected ? "text-text" : "text-text-muted"} hover:bg-surface-overlay hover:text-text`}
      id={id}
      onClick={onSelect}
      role="option"
      type="button"
    >
      <span className="text-text">{label}</span>
      <span className="text-text-muted text-xs">{description}</span>
    </button>
  );
}
