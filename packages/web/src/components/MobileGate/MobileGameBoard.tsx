import { type FC, type MutableRefObject } from "react";
import { HOURS_AM_SHORT_FORMAT } from "@core/constants/date.constants";
import dayjs from "@core/util/date/dayjs";
import { theme } from "@web/common/styles/theme";
import { useEventPalette } from "@web/common/styles/theme.util";
import {
  type MobileBlock,
  type MobileLevel,
  type MobilePiece,
  type MobileSlot,
} from "@web/components/MobileGate/mobile-game.levels";

const formatHour = (hour: number) =>
  dayjs().startOf("day").add(hour, "hour").format(HOURS_AM_SHORT_FORMAT);

const BlockView: FC<{
  block: MobileBlock;
  totalMin: number;
  gridStartMin: number;
  flashing: boolean;
}> = ({ block, totalMin, gridStartMin, flashing }) => {
  const { base } = useEventPalette(block.color);
  return (
    <div
      className={`absolute inset-x-0.5 rounded-md px-2 py-0.5 text-xs ${
        block.decoy ? "opacity-60" : ""
      } ${flashing ? "c-game-lock-flash" : ""}`}
      data-game-block={block.id}
      style={{
        top: `${((block.startMin - gridStartMin) / totalMin) * 100}%`,
        height: `${((block.endMin - block.startMin) / totalMin) * 100}%`,
        backgroundColor: base,
        color: theme.getContrastText(base),
      }}
    >
      <span className="block truncate font-medium">{block.title}</span>
    </div>
  );
};

/**
 * The game's fake day grid: hour lines, seeded and locked blocks, the dashed
 * target outline (levels 1-2), and the snapped ghost that follows the finger.
 * Geometry is plain percentage math; `boardRef` marks the columns region so
 * the drag handlers can map pointer coordinates to slots.
 */
export const MobileGameBoard: FC<{
  level: MobileLevel;
  board: readonly MobileBlock[];
  piece: MobilePiece | null;
  hoverSlot: MobileSlot | null;
  /** Keys the lock flash on the most recently placed block. */
  lastAward: { seq: number; pieceId: string } | null;
  boardRef: MutableRefObject<HTMLDivElement | null>;
}> = ({ level, board, piece, hoverSlot, lastAward, boardRef }) => {
  const { base: pieceBase } = useEventPalette(piece?.color);
  const gridStartMin = level.startHour * 60;
  const totalMin = (level.endHour - level.startHour) * 60;
  const hours: number[] = [];
  for (let h = level.startHour; h < level.endHour; h += 1) hours.push(h);

  const slotStyle = (slot: MobileSlot, durationMin: number) => ({
    top: `${((slot.startMin - gridStartMin) / totalMin) * 100}%`,
    height: `${(durationMin / totalMin) * 100}%`,
  });

  return (
    <div className="flex h-full min-h-0 w-full touch-none select-none">
      {/* Time gutter */}
      <div className="flex w-12 shrink-0 flex-col pr-2 text-right">
        <div className="h-6" />
        <div className="relative flex-1">
          {hours.map((hour) => (
            <span
              key={hour}
              className="absolute right-1 -translate-y-1/2 text-[10px] text-text-muted"
              style={{
                top: `${(((hour - level.startHour) * 60) / totalMin) * 100}%`,
              }}
            >
              {formatHour(hour)}
            </span>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Day headers */}
        <div className="flex h-6">
          {level.dayLabels.map((label) => (
            <div
              key={label}
              className="flex flex-1 items-center justify-center font-medium text-text-muted text-xs"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Columns: the drag surface the pointer math maps against. */}
        <div
          className="relative flex min-h-0 flex-1"
          ref={boardRef}
          data-game-board
        >
          {Array.from({ length: level.dayCount }, (_, dayIndex) => (
            <div
              key={level.dayLabels[dayIndex]}
              className="relative flex-1 border-border border-l last:border-r"
            >
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="absolute inset-x-0 border-border/60 border-t"
                  style={{
                    top: `${(((hour - level.startHour) * 60) / totalMin) * 100}%`,
                  }}
                />
              ))}
              {level.slotMin === 30 &&
                hours.map((hour) => (
                  <div
                    key={`half-${hour}`}
                    className="absolute inset-x-0 border-border/30 border-t border-dashed"
                    style={{
                      top: `${(((hour - level.startHour) * 60 + 30) / totalMin) * 100}%`,
                    }}
                  />
                ))}
              {level.showTargetGhost &&
                piece &&
                piece.target.dayIndex === dayIndex && (
                  <div
                    aria-hidden
                    className="absolute inset-x-0.5 rounded-md border-2 border-border-strong border-dashed bg-surface-overlay/40"
                    data-game-target-slot=""
                    style={slotStyle(piece.target, piece.durationMin)}
                  />
                )}
              {board
                .filter((block) => block.dayIndex === dayIndex)
                .map((block) => (
                  <BlockView
                    key={
                      lastAward?.pieceId === block.id
                        ? `${block.id}-flash-${lastAward.seq}`
                        : block.id
                    }
                    block={block}
                    totalMin={totalMin}
                    gridStartMin={gridStartMin}
                    flashing={lastAward?.pieceId === block.id}
                  />
                ))}
              {piece && hoverSlot && hoverSlot.dayIndex === dayIndex && (
                <div
                  aria-hidden
                  className="absolute inset-x-0.5 rounded-md border-2 border-text/40 px-2 py-0.5 text-xs opacity-70"
                  data-game-slot-hover=""
                  style={{
                    ...slotStyle(hoverSlot, piece.durationMin),
                    backgroundColor: pieceBase,
                    color: theme.getContrastText(pieceBase),
                  }}
                >
                  <span className="block truncate font-medium">
                    {piece.title}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
