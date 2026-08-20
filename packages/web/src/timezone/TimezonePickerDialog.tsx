import {
  type KeyboardEvent as ReactKeyboardEvent,
  type UIEvent as ReactUIEvent,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { OverlayPanel } from "@web/components/OverlayPanel/OverlayPanel";
import { getBrowserTimeZone } from "@web/timezone/browser-timezone";
import {
  setPinnedTimeZone,
  useEffectiveTimeZone,
  usePinnedTimeZone,
} from "@web/timezone/effective-timezone.store";
import { formatTimeZoneAbbreviation } from "@web/timezone/format-timezone-abbreviation";
import { TimezoneOptionButton } from "@web/timezone/TimezoneOptionButton";
import {
  buildTimeZoneList,
  filterTimeZones,
  sortTimeZonesByOffsetDistance,
} from "@web/timezone/timezone-catalog";

const AUTO_ID = "auto";
const VISIBLE_PAGE = 40;

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
  const [visibleCount, setVisibleCount] = useState(VISIBLE_PAGE);
  const now = useMemo(() => new Date(), []);
  const catalog = useMemo(
    () =>
      sortTimeZonesByOffsetDistance(buildTimeZoneList(now), effectiveTimeZone),
    [effectiveTimeZone, now],
  );
  const zones = useMemo(
    () => filterTimeZones(catalog, query),
    [catalog, query],
  );

  const browserZone = getBrowserTimeZone();
  const browserAbbreviation = formatTimeZoneAbbreviation(browserZone, now);
  const isAuto = pinnedTimeZone === null;
  const optionIds = [AUTO_ID, ...zones.map((zone) => zone.id)];
  const visibleZones = zones.slice(0, visibleCount);

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
    setVisibleCount((count) => (nextIndex > count ? nextIndex : count));
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

  const handleListScroll = (event: ReactUIEvent<HTMLDivElement>) => {
    const list = event.currentTarget;
    if (list.scrollTop + list.clientHeight < list.scrollHeight - 24) return;
    setVisibleCount((count) => Math.min(zones.length, count + VISIBLE_PAGE));
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
            setVisibleCount(VISIBLE_PAGE);
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
          onScroll={handleListScroll}
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
          {visibleZones.map((zone) => (
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
