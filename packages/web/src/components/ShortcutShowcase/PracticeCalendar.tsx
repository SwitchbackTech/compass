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
  const chipLetter = state.jumpChips?.[block.id];
  const top = ((block.startMin - GRID_START_MIN) / TOTAL_MIN) * 100;
  const height = ((block.endMin - block.startMin) / TOTAL_MIN) * 100;

  // Accent bar, like the real grid's focused-edge indicator.
  const edgeShadow =
    isFocused && state.edge === "start"
      ? "inset 0 3px 0 0 var(--accent)"
      : isFocused && state.edge === "end"
        ? "inset 0 -3px 0 0 var(--accent)"
        : "";
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
        boxShadow: [focusShadow, edgeShadow].filter(Boolean).join(", "),
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
        <div className="truncate font-medium">{block.title || "New event"}</div>
      )}
      {height > 8 && (
        <div className="truncate opacity-80">
          {formatTime(block.startMin)} to {formatTime(block.endMin)}
        </div>
      )}
      {chipLetter && (
        <span className="absolute top-1 right-1">
          <ShortcutHint variant="keycap">
            {chipLetter.toUpperCase()}
          </ShortcutHint>
        </span>
      )}
    </div>
  );
};

/**
 * The showcase's fake grid: day columns, hour lines, and time-positioned
 * blocks, and nothing else. Deliberately not the real TimedGrid, which drags
 * in stores and scroll plumbing the lesson does not need; geometry is plain
 * percentage math off the practice state.
 */
export const PracticeCalendar: FC<{
  state: PracticeState;
  onTitleCommit: (title: string) => void;
}> = ({ state, onTitleCommit }) => {
  const hours: number[] = [];
  for (let h = SHOWCASE_GRID_START_HOUR; h < SHOWCASE_GRID_END_HOUR; h += 1) {
    hours.push(h);
  }

  return (
    <div className="relative flex h-full min-h-0 w-full select-none">
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

      {state.hardcoreOn && (
        <span className="absolute right-2 bottom-2 rounded-full bg-accent px-3 py-1 font-medium text-on-accent text-xs">
          Hardcore Mode on
        </span>
      )}
    </div>
  );
};
