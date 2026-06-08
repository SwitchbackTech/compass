import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useIsMobile } from "@web/common/hooks/useIsMobile";
import { LifeAboutDialog } from "./LifeAboutDialog";
import { LifeDotTooltip } from "./LifeDotTooltip";
import { LifeSelect } from "./LifeSelect";
import {
  CONTAINER_PADDING,
  DOT_GAP,
  DOT_SIZE,
  getAgeOptions,
  getLifeGridColumns,
  getTotalLifeDots,
  getValidBirthDays,
  getWeekLivedCount,
  getYearOptions,
  MONTHS,
} from "./life.utils";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;

interface LifeViewProps {
  enableDotTooltips?: boolean;
  today?: Date;
}

function clampZoom(value: number) {
  return Number(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value)).toFixed(2));
}

function ZoomButton({
  "aria-label": ariaLabel,
  children,
  disabled,
  onClick,
}: {
  "aria-label": string;
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className="inline-flex h-9 w-9 items-center justify-center rounded border border-border-primary bg-panel-badge-bg text-text-lighter transition hover:scale-105 hover:bg-panel-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary disabled:pointer-events-none disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function ZoomControls({
  setZoom,
  zoom,
}: {
  setZoom: Dispatch<SetStateAction<number>>;
  zoom: number;
}) {
  return (
    <div className="mb-4 flex items-center justify-center gap-2">
      <ZoomButton
        aria-label="Zoom out"
        disabled={zoom <= MIN_ZOOM}
        onClick={() => setZoom((current) => clampZoom(current - 0.2))}
      >
        <span aria-hidden="true" className="text-lg leading-none">
          -
        </span>
      </ZoomButton>
      <span className="min-w-20 text-center font-medium text-sm text-text-light">
        {Math.round(zoom * 100)}%
      </span>
      <ZoomButton
        aria-label="Zoom in"
        disabled={zoom >= MAX_ZOOM}
        onClick={() => setZoom((current) => clampZoom(current + 0.2))}
      >
        <span aria-hidden="true" className="text-lg leading-none">
          +
        </span>
      </ZoomButton>
    </div>
  );
}

export function LifeView({ enableDotTooltips = true, today }: LifeViewProps) {
  const [birthYear, setBirthYear] = useState("2000");
  const [birthMonth, setBirthMonth] = useState("1");
  const [birthDay, setBirthDay] = useState("1");
  const [deathAge, setDeathAge] = useState("79");
  const [zoom, setZoom] = useState(1);
  const [baseScale, setBaseScale] = useState(1);
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTouchDistance = useRef<number | null>(null);

  const years = useMemo(
    () => getYearOptions((today ?? new Date()).getFullYear()),
    [today],
  );
  const ages = useMemo(() => getAgeOptions(), []);
  const validDays = useMemo(
    () => getValidBirthDays(birthYear, birthMonth),
    [birthYear, birthMonth],
  );
  const totalDots = useMemo(() => getTotalLifeDots(deathAge), [deathAge]);
  const weeksLived = useMemo(
    () =>
      getWeekLivedCount(
        birthYear,
        birthMonth,
        birthDay,
        totalDots,
        today ?? new Date(),
      ),
    [birthYear, birthMonth, birthDay, totalDots, today],
  );
  const columns = getLifeGridColumns({ isMobile, zoom });
  const dots = useMemo(() => {
    return Array.from({ length: totalDots }).map((_, index) => {
      const weekNumber = index + 1;
      const isFilled = index < weeksLived;
      const dot = (
        <span
          className={`block h-2 w-2 rounded-[1px] transition-colors ${
            isFilled
              ? "bg-accent-primary"
              : "border border-border-primary bg-bg-primary"
          }`}
          key={weekNumber}
          title={`Week ${weekNumber}`}
        />
      );

      if (enableDotTooltips) {
        return (
          <LifeDotTooltip key={weekNumber} weekNumber={weekNumber}>
            {dot}
          </LifeDotTooltip>
        );
      }

      return dot;
    });
  }, [totalDots, weeksLived, enableDotTooltips]);

  useEffect(() => {
    const maxDay = Number.parseInt(validDays.at(-1) ?? "31", 10);
    const currentDay = Number.parseInt(birthDay, 10);

    if (currentDay > maxDay) {
      setBirthDay(String(maxDay));
    }
  }, [birthDay, validDays]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateBaseScale = () => {
      const rect = container.getBoundingClientRect();
      const containerWidth = rect.width - CONTAINER_PADDING;
      const containerHeight = rect.height - CONTAINER_PADDING;

      if (containerWidth <= 0 || containerHeight <= 0) {
        setBaseScale(1);
        return;
      }

      const cellSize = DOT_SIZE + DOT_GAP;
      const rows = Math.ceil(totalDots / columns);
      const gridWidth = columns * cellSize;
      const gridHeight = rows * cellSize;
      setBaseScale(
        Math.min(containerWidth / gridWidth, containerHeight / gridHeight, 1),
      );
    };

    updateBaseScale();
    const resizeObserver = new ResizeObserver(updateBaseScale);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [columns, totalDots]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;

      event.preventDefault();
      const delta = event.deltaY > 0 ? -0.1 : 0.1;
      setZoom((current) => clampZoom(current + delta));
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;

      lastTouchDistance.current = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY,
      );
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || lastTouchDistance.current === null) {
        return;
      }

      event.preventDefault();
      const distance = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY,
      );
      const delta = (distance - lastTouchDistance.current) * 0.01;
      setZoom((current) => clampZoom(current + delta));
      lastTouchDistance.current = distance;
    };

    const clearTouchDistance = () => {
      lastTouchDistance.current = null;
    };

    container.addEventListener("touchstart", handleTouchStart);
    container.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    container.addEventListener("touchend", clearTouchDistance);
    container.addEventListener("touchcancel", clearTouchDistance);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", clearTouchDistance);
      container.removeEventListener("touchcancel", clearTouchDistance);
    };
  }, []);

  const effectiveScale = isMobile ? baseScale : baseScale * zoom;
  const allowScroll = !isMobile && effectiveScale > 1.001;

  return (
    <main className="min-h-screen overflow-auto bg-bg-primary p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <h1 className="font-bold font-mono text-4xl text-text-lighter tracking-normal md:text-5xl">
              MY LIFE IN WEEKS
            </h1>
            <LifeAboutDialog />
          </div>
          <p className="text-text-light">
            Each dot represents one week of your life.
          </p>
        </header>

        <div className="mb-8 flex flex-wrap items-end justify-center gap-4">
          <LifeSelect
            id="life-birth-year"
            label="Birth Year"
            onChange={setBirthYear}
            value={birthYear}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </LifeSelect>
          <LifeSelect
            id="life-birth-month"
            label="Birth Month"
            onChange={setBirthMonth}
            value={birthMonth}
          >
            {MONTHS.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </LifeSelect>
          <LifeSelect
            className="max-w-30"
            id="life-birth-day"
            label="Birth Day"
            onChange={setBirthDay}
            value={birthDay}
          >
            {validDays.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </LifeSelect>
          <LifeSelect
            id="life-death-age"
            label="Death Age"
            onChange={setDeathAge}
            value={deathAge}
          >
            {ages.map((age) => (
              <option key={age} value={age}>
                {age}
              </option>
            ))}
          </LifeSelect>
        </div>

        {weeksLived > 0 ? (
          <div className="mb-6 text-center" role="status" aria-live="polite">
            <p className="font-medium text-lg text-text-lighter">
              You've lived{" "}
              <span className="font-bold text-accent-primary">
                {weeksLived}
              </span>{" "}
              weeks ({Math.floor(weeksLived / 52)} years)
            </p>
          </div>
        ) : null}

        <ZoomControls setZoom={setZoom} zoom={zoom} />

        <section
          aria-label="Life in weeks visualization"
          className={`h-[60vh] rounded border border-border-primary p-4 md:p-6 ${
            allowScroll ? "compass-scroll overflow-auto" : "overflow-hidden"
          }`}
          ref={containerRef}
        >
          <div
            className={`flex h-full ${
              allowScroll
                ? "items-start justify-start"
                : "items-center justify-center"
            }`}
          >
            <div
              className={`transition-transform duration-200 ${
                allowScroll ? "origin-top-left" : "origin-center"
              }`}
              style={{ transform: `scale(${effectiveScale})` }}
            >
              <div
                className="grid gap-0.5"
                data-total-dots={totalDots}
                style={{
                  gridTemplateColumns: `repeat(${columns}, ${DOT_SIZE}px)`,
                }}
              >
                {dots}
              </div>
            </div>
          </div>
        </section>

        <p className="mt-6 text-center text-text-light text-xs">
          {isMobile ? "Pinch " : "Use Ctrl+Scroll "} or use buttons to zoom
        </p>
      </div>
    </main>
  );
}

export default LifeView;
