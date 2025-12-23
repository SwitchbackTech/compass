import { act } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import {
  CLASS_TIMED_CALENDAR_EVENT,
  DATA_EVENT_ELEMENT_ID,
} from "@web/common/constants/web.constants";
import { useGridOrganization } from "@web/common/hooks/useGridOrganization";

describe("useGridOrganization", () => {
  const rectMap = new Map<HTMLElement, DOMRect>();

  beforeAll(() => {
    jest
      .spyOn(Element.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        const rect = rectMap.get(this);
        return (
          rect ||
          ({
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            toJSON: () => {},
          } as DOMRect)
        );
      });
  });

  afterEach(() => {
    rectMap.clear();
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("should reorder grid when nodes are added", async () => {
    const mainGrid = document.createElement("div");
    document.body.appendChild(mainGrid);
    rectMap.set(mainGrid, {
      width: 1000,
      x: 0,
      y: 0,
      height: 1000,
      top: 0,
      right: 1000,
      bottom: 1000,
      left: 0,
      toJSON: () => {},
    });

    renderHook(() => useGridOrganization(mainGrid));

    const node = document.createElement("div");
    node.classList.add(CLASS_TIMED_CALENDAR_EVENT);
    node.setAttribute(DATA_EVENT_ELEMENT_ID, "test-event-id");
    rectMap.set(node, {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      top: 0,
      right: 100,
      bottom: 100,
      left: 0,
      toJSON: () => {},
    });

    await act(async () => {
      mainGrid.appendChild(node);
    });

    await waitFor(() => {
      expect(node.style.width).not.toBe("");
    });

    document.body.removeChild(mainGrid);
  });
});
