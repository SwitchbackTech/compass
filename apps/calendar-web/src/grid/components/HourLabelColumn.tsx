import { TIMED_HOUR_SLOT_HEIGHT_CLASS } from "@web/grid/grid.constants";

export function HourLabelColumn({
  colors,
  labels,
  width,
}: {
  colors?: string[];
  labels: string[];
  width: number;
}) {
  return (
    // Block flow, not flex-col: hour labels must overflow this viewport-tall
    // column at one grid-hour each. Flex-shrink would compress them into the
    // visible 13 hours. The stack sits one hour above its box so row bands and
    // gutter labels share the same origin as timed events (see boot-timed rows).
    <div
      className="h-full -translate-y-[calc(100%/var(--calendar-visible-hours))]"
      style={{ width }}
    >
      {labels.map((label, hour) => (
        <div
          className={`${TIMED_HOUR_SLOT_HEIGHT_CLASS} text-text-muted`}
          // biome-ignore lint/suspicious/noArrayIndexKey: hour slot identity; DST can repeat a wall-clock label.
          key={`hour-${hour + 1}`}
          style={colors ? { color: colors[hour] } : undefined}
        >
          <span className="block text-center text-[10px]">{label}</span>
        </div>
      ))}
    </div>
  );
}
