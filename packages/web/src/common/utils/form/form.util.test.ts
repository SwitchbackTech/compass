import {
  ID_CONTEXT_MENU_ITEMS,
  ID_EVENT_FORM,
  ID_SOMEDAY_EVENT_FORM,
} from "../../constants/web.constants";
import {
  isComboboxInteraction,
  isContextMenuOpen,
  isEventFormOpen,
} from "./form.util";

// Mock DOM methods
const mockGetElementsByName = jest.fn();
const mockGetElementById = jest.fn();

// Mock document
Object.defineProperty(document, "getElementsByName", {
  value: mockGetElementsByName,
  writable: true,
});

Object.defineProperty(document, "getElementById", {
  value: mockGetElementById,
  writable: true,
});

describe("form.util", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe("isEventFormOpen", () => {
    it("should return true when event form is open", () => {
      // Mock getElementsByName to return a single element for ID_EVENT_FORM
      mockGetElementsByName.mockImplementation((name) => {
        if (name === ID_EVENT_FORM) {
          return [{ name: ID_EVENT_FORM }]; // Mock HTMLCollection with one element
        }
        return []; // Empty HTMLCollection for other names
      });

      const result = isEventFormOpen();

      expect(result).toBe(true);
      expect(mockGetElementsByName).toHaveBeenCalledWith(ID_EVENT_FORM);
      // Note: Due to short-circuit evaluation, ID_SOMEDAY_EVENT_FORM won't be called
      // when ID_EVENT_FORM returns a truthy result
    });

    it("should return true when someday event form is open", () => {
      // Mock getElementsByName to return a single element for ID_SOMEDAY_EVENT_FORM
      mockGetElementsByName.mockImplementation((name) => {
        if (name === ID_SOMEDAY_EVENT_FORM) {
          return [{ name: ID_SOMEDAY_EVENT_FORM }]; // Mock HTMLCollection with one element
        }
        return []; // Empty HTMLCollection for other names
      });

      const result = isEventFormOpen();

      expect(result).toBe(true);
      expect(mockGetElementsByName).toHaveBeenCalledWith(ID_EVENT_FORM);
      expect(mockGetElementsByName).toHaveBeenCalledWith(ID_SOMEDAY_EVENT_FORM);
    });

    it("should return false when no forms are open", () => {
      // Mock getElementsByName to return empty HTMLCollection for all names
      mockGetElementsByName.mockReturnValue([]);

      const result = isEventFormOpen();

      expect(result).toBe(false);
      expect(mockGetElementsByName).toHaveBeenCalledWith(ID_EVENT_FORM);
      expect(mockGetElementsByName).toHaveBeenCalledWith(ID_SOMEDAY_EVENT_FORM);
    });

    it("should return false when forms exist but length is not 1", () => {
      // Mock getElementsByName to return multiple elements (length !== 1)
      mockGetElementsByName.mockImplementation((name) => {
        if (name === ID_EVENT_FORM) {
          return [{ name: ID_EVENT_FORM }, { name: ID_EVENT_FORM }]; // 2 elements
        }
        return []; // Empty HTMLCollection for other names
      });

      const result = isEventFormOpen();

      expect(result).toBe(false);
    });
  });

  describe("isContextMenuOpen", () => {
    it("should return true when context menu is open", () => {
      // Mock getElementById to return an element
      const mockElement = { id: ID_CONTEXT_MENU_ITEMS };
      mockGetElementById.mockReturnValue(mockElement);

      const result = isContextMenuOpen();

      expect(result).toBe(true);
      expect(mockGetElementById).toHaveBeenCalledWith(ID_CONTEXT_MENU_ITEMS);
    });

    it("should return false when context menu is not open", () => {
      // Mock getElementById to return null
      mockGetElementById.mockReturnValue(null);

      const result = isContextMenuOpen();

      expect(result).toBe(false);
      expect(mockGetElementById).toHaveBeenCalledWith(ID_CONTEXT_MENU_ITEMS);
    });

    it("should return false when context menu element is undefined", () => {
      // Mock getElementById to return undefined
      mockGetElementById.mockReturnValue(undefined);

      const result = isContextMenuOpen();

      expect(result).toBe(false);
      expect(mockGetElementById).toHaveBeenCalledWith(ID_CONTEXT_MENU_ITEMS);
    });

    it("should return false when context menu element is empty string", () => {
      // Mock getElementById to return empty string (falsy value)
      mockGetElementById.mockReturnValue("");

      const result = isContextMenuOpen();

      expect(result).toBe(false);
      expect(mockGetElementById).toHaveBeenCalledWith(ID_CONTEXT_MENU_ITEMS);
    });

    it("should return false when context menu element is 0", () => {
      // Mock getElementById to return 0 (falsy value)
      mockGetElementById.mockReturnValue(0);

      const result = isContextMenuOpen();

      expect(result).toBe(false);
      expect(mockGetElementById).toHaveBeenCalledWith(ID_CONTEXT_MENU_ITEMS);
    });

    it("should return true for any truthy element", () => {
      // Mock getElementById to return a truthy value
      mockGetElementById.mockReturnValue("truthy-string");

      const result = isContextMenuOpen();

      expect(result).toBe(true);
      expect(mockGetElementById).toHaveBeenCalledWith(ID_CONTEXT_MENU_ITEMS);
    });
  });

  describe("isComboboxInteraction", () => {
    const createEvent = (element: HTMLElement | null) =>
      ({ target: element }) as unknown as KeyboardEvent;

    it("returns true when role is combobox", () => {
      const element = document.createElement("div");
      element.setAttribute("role", "combobox");

      expect(isComboboxInteraction(createEvent(element))).toBe(true);
    });

    it("returns true when inside freq-select control", () => {
      const wrapper = document.createElement("div");
      wrapper.className = "freq-select__control";
      const child = document.createElement("span");
      wrapper.appendChild(child);

      expect(isComboboxInteraction(createEvent(child))).toBe(true);
    });

    it("returns false when no combobox context is present", () => {
      const element = document.createElement("div");

      expect(isComboboxInteraction(createEvent(element))).toBe(false);
    });

    it("returns false when target is null", () => {
      expect(isComboboxInteraction(createEvent(null))).toBe(false);
    });
  });
});
