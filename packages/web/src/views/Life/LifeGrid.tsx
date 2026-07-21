import { getLifeDotLabel, WEEKS_PER_ROW } from "./life.utils";

interface LifeGridProps {
  showCurrentWeek: boolean;
  totalDots: number;
  weeksLived: number;
}

const DOTS = Array.from({ length: WEEKS_PER_ROW }, (_, index) => index);

function getDotClassName(
  index: number,
  weeksLived: number,
  showCurrentWeek: boolean,
) {
  if (showCurrentWeek && index === weeksLived) {
    return "bg-accent ring-1 ring-accent/60";
  }

  if (index < weeksLived) {
    return "bg-accent";
  }

  return "bg-text/15";
}

export function LifeGrid({
  showCurrentWeek,
  totalDots,
  weeksLived,
}: LifeGridProps) {
  const rows = Math.ceil(totalDots / WEEKS_PER_ROW);

  return (
    <div className="flex min-w-0 flex-col gap-px" data-total-dots={totalDots}>
      {Array.from({ length: rows }, (_, rowIndex) => {
        const age = rowIndex + 1;

        return (
          <div
            className="grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-2"
            key={age}
          >
            <span
              aria-hidden="true"
              className="text-right text-[10px] text-text-muted/70 tabular-nums"
            >
              {age === 1 || age % 10 === 0 ? age : ""}
            </span>
            <div
              className="grid min-w-0 gap-px"
              style={{
                gridTemplateColumns: `repeat(${WEEKS_PER_ROW}, minmax(0, 1fr))`,
              }}
            >
              {DOTS.map((weekIndex) => {
                const dotIndex = rowIndex * WEEKS_PER_ROW + weekIndex;
                if (dotIndex >= totalDots) return null;

                return (
                  <span
                    aria-hidden="true"
                    className={`aspect-square w-full max-w-2 justify-self-center rounded-[1px] ${getDotClassName(dotIndex, weeksLived, showCurrentWeek)}`}
                    key={dotIndex}
                    title={getLifeDotLabel(dotIndex + 1)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
