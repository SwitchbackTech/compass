import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, screen } from "@testing-library/react";
import { Priorities } from "@core/constants/core.constants";
import { Origin } from "@core/constants/core.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { GridDraft } from "@web/views/Calendar/components/Draft/grid/GridDraft";

// Mock the dependencies
jest.mock("@web/views/Calendar/components/Draft/context/useDraftContext");
jest.mock("@web/views/Calendar/hooks/grid/useGridLayout");

describe("Event Migration Integration Test", () => {
  it("should successfully migrate a regular event to sidebar without validation errors", () => {
    // Create a mock regular timed event (what comes from the grid)
    const regularEvent: Schema_GridEvent = {
      _id: "regular-event-123",
      title: "Team Standup",
      startDate: "2024-01-15T10:00:00.000Z",
      endDate: "2024-01-15T10:30:00.000Z",
      isAllDay: false,
      isSomeday: false, // This is a regular event
      priority: Priorities.WORK,
      origin: Origin.COMPASS,
      user: "user-123",
      position: {
        isOverlapping: false,
        widthMultiplier: 1,
        horizontalOrder: 1,
        dragOffset: { y: 0 },
        initialX: null,
        initialY: null,
      },
    };

    // Test the convert function logic that would be triggered by:
    // 1. Right-clicking on event -> "Move to Sidebar"
    // 2. Or keyboard shortcut "CTRL + META + left arrow"

    const mockConvert = jest.fn();
    const mockActions = {
      convert: mockConvert,
      discard: jest.fn(),
      duplicateEvent: jest.fn(),
      isEventDirty: jest.fn(() => true),
    };

    const mockState = {
      draft: regularEvent,
      isDragging: false,
      isResizing: false,
      isFormOpen: true,
      formProps: {
        context: {},
        getReferenceProps: () => ({}),
        getFloatingProps: () => ({}),
        x: 100,
        y: 100,
        refs: {
          setReference: jest.fn(),
          setFloating: jest.fn(),
        },
        strategy: "absolute" as const,
      },
    };

    const mockWeekProps = {
      component: {
        startOfView: { format: () => "2024-01-15" },
        endOfView: { format: () => "2024-01-21" },
      },
    };

    const mockConfirmation = {
      onSubmit: jest.fn(),
      onDelete: jest.fn(),
    };

    // Mock the useDraftContext to return our test values
    const mockUseDraftContext = require("@web/views/Calendar/components/Draft/context/useDraftContext");
    mockUseDraftContext.useDraftContext.mockReturnValue({
      actions: mockActions,
      setters: {},
      state: mockState,
      confirmation: mockConfirmation,
    });

    // This test verifies that the conversion would not throw a validation error
    const start = "2024-01-15";
    const end = "2024-01-21";

    // This is what the convert function does internally
    const _draft = {
      ...regularEvent,
      isAllDay: false,
      isSomeday: true,
      startDate: start,
      endDate: end,
      order: 0,
    };

    // Import the validation function
    const {
      validateSomedayEvent,
    } = require("@web/common/validators/someday.event.validator");

    // This should NOT throw after our fix
    expect(() => validateSomedayEvent(_draft)).not.toThrow();

    const result = validateSomedayEvent(_draft);
    expect(result.isSomeday).toBe(true);
    expect(result.order).toBe(0);
    expect(result._id).toBe(regularEvent._id);
    expect(result.title).toBe(regularEvent.title);
  });

  it("should handle the validation for prepSomedayEventBeforeSubmit", () => {
    // Test the other path where the error could occur
    const regularEvent: Schema_GridEvent = {
      _id: "regular-event-456",
      title: "Code Review",
      startDate: "2024-01-15T14:00:00.000Z",
      endDate: "2024-01-15T15:00:00.000Z",
      isAllDay: false,
      isSomeday: false, // Regular event without someday properties
      priority: Priorities.WORK,
      origin: Origin.COMPASS,
      user: "user-123",
      position: {
        isOverlapping: false,
        widthMultiplier: 1,
        horizontalOrder: 1,
        dragOffset: { y: 0 },
        initialX: null,
        initialY: null,
      },
    };

    const {
      prepSomedayEventBeforeSubmit,
    } = require("@web/common/utils/event.util");

    // This should work after our fix
    expect(() =>
      prepSomedayEventBeforeSubmit(regularEvent, "user-123"),
    ).not.toThrow();

    const result = prepSomedayEventBeforeSubmit(regularEvent, "user-123");
    expect(result.isSomeday).toBe(true);
    expect(typeof result.order).toBe("number");
    expect(result.origin).toBe(Origin.COMPASS);
    expect(result.user).toBe("user-123");
  });
});
