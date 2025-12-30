import { createMockTask } from "@core/__tests__/helpers/task.factory";
import { Origin, Priorities } from "@core/constants/core.constants";
import dayjs from "@core/util/date/dayjs";
import { convertTaskToEvent } from "./convertTaskToEvent";

describe("convertTaskToEvent", () => {
  const mockUserId = "user123";
  const mockTask = createMockTask({
    id: "task1",
    title: "Test Task",
    description: "Test description",
  });

  it("should convert a task to an event with default duration", () => {
    const startTime = dayjs("2025-01-01T10:00:00.000Z");
    const event = convertTaskToEvent(mockTask, startTime, 30, mockUserId);

    expect(event).toMatchObject({
      title: "Test Task",
      description: "Test description",
      startDate: "2025-01-01T10:00:00.000Z",
      endDate: "2025-01-01T10:30:00.000Z",
      isAllDay: false,
      isSomeday: false,
      user: mockUserId,
      priority: Priorities.UNASSIGNED,
      origin: Origin.COMPASS,
    });
    expect(event._id).toBeDefined();
  });

  it("should convert a task to an event with custom duration", () => {
    const startTime = dayjs("2025-01-01T14:30:00.000Z");
    const event = convertTaskToEvent(mockTask, startTime, 30, mockUserId);

    expect(event).toMatchObject({
      startDate: "2025-01-01T14:30:00.000Z",
      endDate: "2025-01-01T15:00:00.000Z",
    });
  });

  it("should handle task without description", () => {
    const taskWithoutDescription = createMockTask({
      description: undefined,
    });
    const startTime = dayjs("2025-01-01T10:00:00.000Z");
    const event = convertTaskToEvent(
      taskWithoutDescription,
      startTime,
      30,
      mockUserId,
    );

    expect(event.description).toBe("");
  });

  it("should generate a unique ObjectId for each conversion", () => {
    const startTime = dayjs("2025-01-01T10:00:00.000Z");
    const event1 = convertTaskToEvent(mockTask, startTime, 30, mockUserId);
    const event2 = convertTaskToEvent(mockTask, startTime, 30, mockUserId);

    expect(event1._id).not.toBe(event2._id);
  });

  it("should create an all-day event when isAllDay is true", () => {
    const startTime = dayjs("2025-01-01T00:00:00.000Z");
    const event = convertTaskToEvent(mockTask, startTime, 30, mockUserId, true);

    expect(event.isAllDay).toBe(true);
    expect(event).toMatchObject({
      title: "Test Task",
      description: "Test description",
      startDate: "2025-01-01T00:00:00.000Z",
      endDate: "2025-01-01T00:30:00.000Z",
      user: mockUserId,
      priority: Priorities.UNASSIGNED,
      origin: Origin.COMPASS,
    });
  });
});
