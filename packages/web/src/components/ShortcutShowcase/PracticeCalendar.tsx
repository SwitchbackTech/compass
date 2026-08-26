import { type FC } from "react";
import {
  HOURS_AM_FORMAT,
  HOURS_AM_SHORT_FORMAT,
} from "@core/constants/date.constants";
import dayjs from "@core/util/date/dayjs";
import { theme } from "@web/common/styles/theme";
import { useEventPalette } from "@web/common/styles/theme.util";
import {
  type PracticeEventBlock,
  type PracticeState,
  SHOWCASE_DAY_COUNT,
  SHOWCASE_GRID_END_HOUR,
  SHOWCASE_GRID_START_HOUR,
} from "@web/components/ShortcutShowcase/practice.state";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";

const DAY_LABELS = ["Mon", "Tue", "Wed"];
const GRID_START_MIN = SHOWCASE_GRID_START_HOUR * 60;
const TOTAL_MIN = (SHOWCASE_GRID_END_HOUR - SHOWCASE_GRID_START_HOUR) * 60;

// Same format constants the real grid uses, so the first calendar a new
// user sees reads exactly like the one they graduate into.
const formatHour = (hour: number) =>
  dayjs().startOf("day").add(hour, "hour").format(HOURS_AM_SHORT_FORMAT);

const formatTime = (minutes: number) =>
  dayjs().startOf("day").add(minutes, "minute").format(HOURS_AM_FORMAT);

const PracticeBlock: FC<{
  block: PracticeEventBlock;
  state: PracticeState;
  onTitleCommit: (title: string) => void;
}> = ({ block, state, onTitleCommit }) => {
  const { base } = useEventPalette(block.color);
  const contentColor = theme.getContrastText(base);
  const isFocused = state.focusedId === block.id;
  const isEditing = state.editor?.eventId === block.id;
  const top = ((block.startMin - GRID_START_MIN) / TOTAL_MIN) * 100;
  const height = ((block.endMin - block.startMin) / TOTAL_MIN) * 100;

  const focusShadow = isFocused
    ? "0 0 0 1px var(--background), 0 0 0 3px color-mix(in srgb, var(--text) 70%, transparent)"
    : "";

  return (
    <div
      className="absolute inset-x-1 rounded-md px-2 py-1 text-xs transition-all duration-200"
      data-practice-event-id={block.id}
      data-practice-focused={isFocused ? "" : undefined}
      style={{
        top: `${top}%`,
        height: `${height}%`,
        backgroundColor: base,
        color: contentColor,
        boxShadow: focusShadow,
      }}
    >
      {isEditing ? (
        <input
          // biome-ignore lint/a11y/noAutofocus: keyboard lesson; focus must land in the field the keystroke opened
          autoFocus
          aria-label="Event title"
          className="w-full bg-transparent font-medium outline-none placeholder:opacity-60"
          data-practice-title-input=""
          defaultValue={block.title}
          placeholder="Add a title"
          style={{ color: contentColor }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.stopPropagation();
              onTitleCommit(event.currentTarget.value);
            }
          }}
        />
      ) : (
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 truncate font-medium">
            {block.title || "New event"}
          </div>
          {state.jumpHintsVisible && (
            <ShortcutHint className="shrink-0">
              {block.jumpKey.toUpperCase()}
            </ShortcutHint>
          )}
          {state.editArmed && isFocused && (
            <ShortcutHint className="shrink-0">T</ShortcutHint>
          )}
        </div>
      )}
      {height > 8 && (
        <div className="truncate opacity-80">
          {formatTime(block.startMin)} to {formatTime(block.endMin)}
        </div>
      )}
    </div>
  );
};

const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Static month-picker chrome so the sandbox reads like the real sidebar.
 * Not interactive: the lesson only needs a place to park a jump chip.
 */
const PracticeSidebar: FC<{ showPageJumpHints: boolean }> = ({
  showPageJumpHints,
}) => {
  const monthLabel = dayjs().format("MMMM");

  return (
    <div
      aria-hidden
      className="relative flex w-28 shrink-0 flex-col gap-3 border-border border-r pr-3"
      data-practice-jump="sidebar"
    >
      {showPageJumpHints && (
        <ShortcutHint className="absolute top-1 right-1 z-10">2</ShortcutHint>
      )}
      <div className="font-medium text-text-muted text-xs">{monthLabel}</div>
      <div className="grid grid-cols-7 gap-px">
        {WEEKDAY_INITIALS.map((label, index) => (
          <span
            key={`${label}-${index}`}
            className="text-center text-[8px] text-text-muted"
          >
            {label}
          </span>
        ))}
        {Array.from({ length: 35 }, (_, index) => (
          <span
            key={index}
            className="mx-auto size-2 rounded-sm bg-surface-overlay"
          />
        ))}
      </div>
      <div className="rounded-md bg-surface-overlay px-2 py-1.5 text-[10px] text-text-muted">
        Up next
      </div>
    </div>
  );
};

/**
 * The showcase's fake grid: a sidebar, day columns, hour lines, and
 * time-positioned blocks. Deliberately not the real TimedGrid, which drags
 * in stores and scroll plumbing the lesson does not need; geometry is plain
 * percentage math off the practice state.
 */
export const PracticeCalendar: FC<{
  state: PracticeState;
  onTitleCommit: (title: string) => void;
  showPageJumpHints?: boolean;
}> = ({ state, onTitleCommit, showPageJumpHints = false }) => {
  const hours: number[] = [];
  for (let h = SHOWCASE_GRID_START_HOUR; h < SHOWCASE_GRID_END_HOUR; h += 1) {
    hours.push(h);
  }

  return (
    <div
      className="relative flex h-full min-h-0 w-full select-none"
      data-practice-jump="calendar"
    >
      <PracticeSidebar showPageJumpHints={showPageJumpHints} />

      {/* Time column */}
      <div className="flex w-14 shrink-0 flex-col border-border border-r pr-2 text-right">
        <div className="h-7" />
        <div className="relative flex-1">
          {hours.map((hour) => (
            <span
              key={hour}
              className="absolute right-2 -translate-y-1/2 text-[10px] text-text-muted"
              style={{
                top: `${(((hour - SHOWCASE_GRID_START_HOUR) * 60) / TOTAL_MIN) * 100}%`,
              }}
            >
              {formatHour(hour)}
            </span>
          ))}
        </div>
      </div>

      {/* Day columns */}
      {Array.from({ length: SHOWCASE_DAY_COUNT }, (_, dayIndex) => (
        <div
          key={DAY_LABELS[dayIndex]}
          className="flex min-w-0 flex-1 flex-col border-border border-r last:border-r-0"
        >
          <div className="flex h-7 items-center justify-center font-medium text-text-muted text-xs">
            {DAY_LABELS[dayIndex]}
          </div>
          <div className="relative flex-1">
            {showPageJumpHints && dayIndex === 0 && (
              <ShortcutHint className="absolute top-2 left-1 z-10">
                1
              </ShortcutHint>
            )}
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute inset-x-0 border-border/60 border-t"
                style={{
                  top: `${(((hour - SHOWCASE_GRID_START_HOUR) * 60) / TOTAL_MIN) * 100}%`,
                }}
              />
            ))}
            {state.events
              .filter((block) => block.dayIndex === dayIndex)
              .map((block) => (
                <PracticeBlock
                  key={block.id}
                  block={block}
                  state={state}
                  onTitleCommit={onTitleCommit}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};
