import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { act } from "react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockGetAgendaEventTime = mock();
const mockGetNowLinePosition = mock();
const mockSetupMinuteSync = mock();

mock.module("@web/common/utils/dom/grid-organization.util", () => {
  const { BehaviorSubject } = require("rxjs");

  return {
    maxAgendaZIndex$: new BehaviorSubject(10),
    maxGridZIndex$: new BehaviorSubject(10),
  };
});

mock.module("@web/views/Day/util/agenda/agenda.util", () => ({
  getAgendaEventTime: mockGetAgendaEventTime,
  getNowLinePosition: mockGetNowLinePosition,
}));

mock.module("@web/views/Day/util/time/time.util", () => ({
  setupMinuteSync: mockSetupMinuteSync,
}));

const { NowLine } =
  require("@web/views/Day/components/Agenda/NowLine/NowLine") as typeof import("@web/views/Day/components/Agenda/NowLine/NowLine");

describe("NowLine", () => {
  beforeEach(() => {
    mockGetAgendaEventTime.mockClear();
    mockGetNowLinePosition.mockClear();
    mockSetupMinuteSync.mockClear();

    mockGetNowLinePosition.mockReturnValue(100);
    mockGetAgendaEventTime.mockReturnValue("10:00 AM");
    mockSetupMinuteSync.mockImplementation(() => {
      return mock();
    });
  });

  it("renders correctly", () => {
    render(<NowLine />);

    const nowLine = screen.getByText("10:00 AM");
    expect(nowLine).toBeInTheDocument();
  });

  it("sets the correct position style", () => {
    const { container } = render(<NowLine />);

    // The main div has data-now-marker="true"
    const nowLineElement = container.querySelector('[data-now-marker="true"]');
    expect(nowLineElement).toHaveStyle({ top: "100px" });
  });

  it("sets z-index above the max grid z-index", () => {
    const { container } = render(<NowLine />);

    const nowLineElement = container.querySelector('[data-now-marker="true"]');
    expect(nowLineElement).toHaveStyle({ zIndex: "11" });
  });

  it("updates time on minute sync", () => {
    let syncCallback: () => void;
    mockSetupMinuteSync.mockImplementation((cb) => {
      syncCallback = cb;
      return mock();
    });

    render(<NowLine />);

    // Initial render
    expect(mockGetNowLinePosition).toHaveBeenCalledTimes(1);

    // Simulate minute sync
    act(() => {
      if (syncCallback) {
        syncCallback();
      }
    });

    // Should have updated state and re-rendered
    expect(mockGetNowLinePosition).toHaveBeenCalledTimes(2);
  });

  it("cleans up minute sync on unmount", () => {
    const cleanupMock = mock();
    mockSetupMinuteSync.mockReturnValue(cleanupMock);

    const { unmount } = render(<NowLine />);

    unmount();

    expect(cleanupMock).toHaveBeenCalled();
  });
});
