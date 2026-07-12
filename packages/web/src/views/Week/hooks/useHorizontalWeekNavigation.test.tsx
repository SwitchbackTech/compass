import { fireEvent, render, screen } from "@testing-library/react";
import { type FC, useRef } from "react";
import { useHorizontalWeekNavigation } from "@web/views/Week/hooks/useHorizontalWeekNavigation";
import { describe, expect, it, mock } from "bun:test";

const Harness: FC<{
  onNext: () => void;
  onPrevious: () => void;
}> = ({ onNext, onPrevious }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useHorizontalWeekNavigation({ containerRef, onNext, onPrevious });

  return <div ref={containerRef} data-testid="calendar" />;
};

describe("useHorizontalWeekNavigation", () => {
  it("navigates once when a horizontal gesture crosses the threshold", () => {
    const onNext = mock();
    render(<Harness onNext={onNext} onPrevious={mock()} />);

    const calendar = screen.getByTestId("calendar");
    fireEvent.wheel(calendar, { deltaX: 35, deltaY: 2 });
    fireEvent.wheel(calendar, { deltaX: 35, deltaY: 2 });
    fireEvent.wheel(calendar, { deltaX: 100, deltaY: 2 });

    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("navigates backward for a leftward gesture", () => {
    const onPrevious = mock();
    render(<Harness onNext={mock()} onPrevious={onPrevious} />);

    fireEvent.wheel(screen.getByTestId("calendar"), {
      deltaX: -70,
      deltaY: 0,
    });

    expect(onPrevious).toHaveBeenCalledTimes(1);
  });

  it("does not hijack vertical scrolling or pinch zoom", () => {
    const onNext = mock();
    const onPrevious = mock();
    render(<Harness onNext={onNext} onPrevious={onPrevious} />);

    const calendar = screen.getByTestId("calendar");
    fireEvent.wheel(calendar, { deltaX: 20, deltaY: 80 });
    fireEvent.wheel(calendar, { ctrlKey: true, deltaX: 80, deltaY: 0 });

    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
  });

  it("preserves horizontal scrolling inside an overflowing calendar area", () => {
    const onNext = mock();
    render(<Harness onNext={onNext} onPrevious={mock()} />);

    const calendar = screen.getByTestId("calendar");
    const scrollArea = document.createElement("div");
    Object.defineProperties(scrollArea, {
      clientWidth: { value: 100 },
      scrollWidth: { value: 200 },
    });
    calendar.append(scrollArea);

    fireEvent.wheel(scrollArea, { deltaX: 80, deltaY: 0 });

    expect(onNext).not.toHaveBeenCalled();
  });
});
