import {
  CLASS_ALL_DAY_CALENDAR_EVENT,
  CLASS_TIMED_CALENDAR_EVENT,
  DATA_EVENT_ELEMENT_ID,
  ID_GRID_ALLDAY_ROW,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import {
  focusFirstAgendaEvent,
  getFirstAgendaEvent,
  getFocusedEvent,
} from "@web/views/Day/util/agenda/focus.util";

// Mocks
jest.mock("@web/common/context/pointer-position", () => ({
  getElementAtPointer: jest.fn(() => null),
  isOverAllDayRow: jest.fn(() => false),
  isOverMainGrid: jest.fn(() => false),
  isOverSomedayMonth: jest.fn(() => false),
  isOverSomedayWeek: jest.fn(() => false),
}));

describe("focus.util", () => {
  const mockFocus = jest.fn();
  const mockScrollIntoView = jest.fn();
  const mockGetElementById = jest.spyOn(document, "getElementById");

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetElementById.mockReturnValue(null);
  });

  const createMockElement = (id: string, className: string) => {
    const element = document.createElement("div");
    element.setAttribute(DATA_EVENT_ELEMENT_ID, id);
    element.classList.add(className);
    element.focus = mockFocus;
    element.scrollIntoView = mockScrollIntoView;
    return element;
  };

  describe("getFirstAgendaEvent", () => {
    it("should return all-day event if present", () => {
      const allDayGrid = document.createElement("div");
      const allDayEvent = createMockElement(
        "all-day-1",
        CLASS_ALL_DAY_CALENDAR_EVENT,
      );
      allDayGrid.appendChild(allDayEvent);

      mockGetElementById.mockImplementation((id) => {
        if (id === ID_GRID_ALLDAY_ROW) return allDayGrid;
        return null;
      });

      const result = getFirstAgendaEvent();
      expect(result).toBe(allDayEvent);
    });

    it("should return timed event if no all-day event", () => {
      const mainGrid = document.createElement("div");
      const timedEvent = createMockElement(
        "timed-1",
        CLASS_TIMED_CALENDAR_EVENT,
      );
      mainGrid.appendChild(timedEvent);

      mockGetElementById.mockImplementation((id) => {
        if (id === ID_GRID_MAIN) return mainGrid;
        return null;
      });

      const result = getFirstAgendaEvent();
      expect(result).toBe(timedEvent);
    });

    it("should return null if no events found", () => {
      mockGetElementById.mockReturnValue(null);
      const result = getFirstAgendaEvent();
      expect(result).toBeNull();
    });
  });

  describe("focusFirstAgendaEvent", () => {
    it("should focus the first event found", () => {
      const allDayGrid = document.createElement("div");
      const allDayEvent = createMockElement(
        "all-day-1",
        CLASS_ALL_DAY_CALENDAR_EVENT,
      );
      allDayGrid.appendChild(allDayEvent);

      mockGetElementById.mockImplementation((id) => {
        if (id === ID_GRID_ALLDAY_ROW) return allDayGrid;
        return null;
      });

      focusFirstAgendaEvent();

      expect(mockScrollIntoView).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "start",
      });
      expect(mockFocus).toHaveBeenCalledWith({ preventScroll: true });
    });

    it("should do nothing if no event found", () => {
      mockGetElementById.mockReturnValue(null);
      focusFirstAgendaEvent();
      expect(mockFocus).not.toHaveBeenCalled();
    });
  });

  describe("getFocusedEvent", () => {
    it("should return active element if it is an event", () => {
      const event = createMockElement("event-1", CLASS_TIMED_CALENDAR_EVENT);
      document.body.appendChild(event);
      // Mock activeElement
      Object.defineProperty(document, "activeElement", {
        value: event,
        configurable: true,
      });

      const result = getFocusedEvent();
      expect(result).toBe(event);

      document.body.removeChild(event);
    });

    it("should fallback to getFirstAgendaEvent if no active event", () => {
      Object.defineProperty(document, "activeElement", {
        value: null,
        configurable: true,
      });

      const allDayGrid = document.createElement("div");
      const allDayEvent = createMockElement(
        "all-day-1",
        CLASS_ALL_DAY_CALENDAR_EVENT,
      );
      allDayGrid.appendChild(allDayEvent);

      mockGetElementById.mockImplementation((id) => {
        if (id === ID_GRID_ALLDAY_ROW) return allDayGrid;
        return null;
      });

      const result = getFocusedEvent();
      expect(result).toBe(allDayEvent);
    });
  });
});
