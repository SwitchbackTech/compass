import dayjs from "dayjs";
import { createAndSubmitEvents } from "./sandbox.util";

// Mock dependencies
jest.mock("@core/constants/core.constants", () => ({
  Origin: {
    COMPASS: "compass",
  },
  Priorities: {
    WORK: "work",
    SELF: "self",
    RELATIONS: "relations",
    UNASSIGNED: "unassigned",
  },
}));

jest.mock("@core/types/event.types", () => ({
  Categories_Event: {
    SOMEDAY_WEEK: "someday_week",
    SOMEDAY_MONTH: "someday_month",
  },
}));

jest.mock("@web/auth/auth.util", () => ({
  getUserId: jest.fn().mockResolvedValue("test-user-id"),
}));

jest.mock("@web/common/styles/theme.util", () => ({
  colorByPriority: {
    work: "#ff6b6b",
    self: "#4ecdc4",
    relationships: "#45b7d1",
  },
}));

jest.mock("@web/common/utils/datetime/web.date.util", () => ({
  getDatesByCategory: jest.fn().mockReturnValue({
    startDate: "2024-01-01T00:00:00.000Z",
    endDate: "2024-01-01T23:59:59.999Z",
  }),
}));

jest.mock("@web/ducks/events/event.api", () => ({
  EventApi: {
    create: jest.fn().mockResolvedValue(undefined),
  },
}));

describe("sandbox.util", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock dayjs to return a consistent date
    jest.spyOn(dayjs.prototype, "startOf").mockReturnThis();
    jest.spyOn(dayjs.prototype, "endOf").mockReturnThis();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("createAndSubmitEvents", () => {
    it("should create and submit events for week and month tasks", async () => {
      const { EventApi } = require("@web/ducks/events/event.api");
      const {
        getDatesByCategory,
      } = require("@web/common/utils/datetime/web.date.util");

      const weekTasks = [
        { text: "Week task 1", color: "#ff6b6b" },
        { text: "Week task 2", color: "#4ecdc4" },
      ];

      const monthTasks = [
        { text: "Month task 1", color: "#45b7d1" },
        { text: "Month task 2", color: "#ff6b6b" },
      ];

      await createAndSubmitEvents(weekTasks, monthTasks);

      // Should call getDatesByCategory for each task
      expect(getDatesByCategory).toHaveBeenCalledTimes(4);

      // Should call EventApi.create with all events
      expect(EventApi.create).toHaveBeenCalledTimes(1);
      expect(EventApi.create).toHaveBeenCalledWith(expect.any(Array));
    });

    it("should create events with correct structure for week tasks", async () => {
      const { EventApi } = require("@web/ducks/events/event.api");
      const { getUserId } = require("@web/auth/auth.util");
      const {
        getDatesByCategory,
      } = require("@web/common/utils/datetime/web.date.util");

      const weekTasks = [{ text: "Test week task", color: "#ff6b6b" }];
      const monthTasks = [];

      await createAndSubmitEvents(weekTasks, monthTasks);

      const createdEvents = EventApi.create.mock.calls[0][0];
      const weekEvent = createdEvents[0];

      expect(weekEvent).toMatchObject({
        title: "Test week task",
        description: "",
        user: "test-user-id",
        isAllDay: false,
        isSomeday: true,
        origin: "compass",
        priority: "work",
      });

      expect(weekEvent.startDate).toBeDefined();
      expect(weekEvent.endDate).toBeDefined();
    });

    it("should create events with correct structure for month tasks", async () => {
      const { EventApi } = require("@web/ducks/events/event.api");
      const { getUserId } = require("@web/auth/auth.util");

      const weekTasks = [];
      const monthTasks = [{ text: "Test month task", color: "#4ecdc4" }];

      await createAndSubmitEvents(weekTasks, monthTasks);

      const createdEvents = EventApi.create.mock.calls[0][0];
      const monthEvent = createdEvents[0];

      expect(monthEvent).toMatchObject({
        title: "Test month task",
        description: "",
        user: "test-user-id",
        isAllDay: false,
        isSomeday: true,
        origin: "compass",
        priority: "self",
      });
    });

    it("should map colors to correct priorities", async () => {
      const { EventApi } = require("@web/ducks/events/event.api");

      const weekTasks = [
        { text: "Work task", color: "#ff6b6b" }, // work
        { text: "Self task", color: "#4ecdc4" }, // self
        { text: "Relations task", color: "#45b7d1" }, // relationships
        { text: "Unknown task", color: "#unknown" }, // unassigned
      ];
      const monthTasks = [];

      await createAndSubmitEvents(weekTasks, monthTasks);

      const createdEvents = EventApi.create.mock.calls[0][0];

      expect(createdEvents[0].priority).toBe("work");
      expect(createdEvents[1].priority).toBe("self");
      expect(createdEvents[2].priority).toBe("relations");
      expect(createdEvents[3].priority).toBe("unassigned");
    });

    it("should handle empty task arrays", async () => {
      const { EventApi } = require("@web/ducks/events/event.api");

      await createAndSubmitEvents([], []);

      expect(EventApi.create).toHaveBeenCalledWith([]);
    });

    it("should handle mixed week and month tasks", async () => {
      const { EventApi } = require("@web/ducks/events/event.api");

      const weekTasks = [{ text: "Week task", color: "#ff6b6b" }];
      const monthTasks = [{ text: "Month task", color: "#4ecdc4" }];

      await createAndSubmitEvents(weekTasks, monthTasks);

      const createdEvents = EventApi.create.mock.calls[0][0];

      expect(createdEvents).toHaveLength(2);
      expect(createdEvents[0].title).toBe("Week task");
      expect(createdEvents[1].title).toBe("Month task");
    });

    it("should call getDatesByCategory with correct parameters", async () => {
      const {
        getDatesByCategory,
      } = require("@web/common/utils/datetime/web.date.util");

      const weekTasks = [{ text: "Week task", color: "#ff6b6b" }];
      const monthTasks = [{ text: "Month task", color: "#4ecdc4" }];

      await createAndSubmitEvents(weekTasks, monthTasks);

      expect(getDatesByCategory).toHaveBeenCalledWith(
        "someday_week",
        expect.any(Object), // weekStart
        expect.any(Object), // weekEnd
      );

      expect(getDatesByCategory).toHaveBeenCalledWith(
        "someday_month",
        expect.any(Object), // weekStart
        expect.any(Object), // weekEnd
      );
    });

    it("should propagate errors from EventApi.create", async () => {
      const { EventApi } = require("@web/ducks/events/event.api");
      const error = new Error("API Error");
      EventApi.create.mockRejectedValueOnce(error);

      const weekTasks = [{ text: "Week task", color: "#ff6b6b" }];
      const monthTasks = [];

      await expect(
        createAndSubmitEvents(weekTasks, monthTasks),
      ).rejects.toThrow("API Error");
    });

    it("should propagate errors from getUserId", async () => {
      const { getUserId } = require("@web/auth/auth.util");
      const error = new Error("Auth Error");
      getUserId.mockRejectedValueOnce(error);

      const weekTasks = [{ text: "Week task", color: "#ff6b6b" }];
      const monthTasks = [];

      await expect(
        createAndSubmitEvents(weekTasks, monthTasks),
      ).rejects.toThrow("Auth Error");
    });
  });
});
