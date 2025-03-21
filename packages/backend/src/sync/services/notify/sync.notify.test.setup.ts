import {
  Origin as MockOrigin,
  Priorities as MockPriorities,
} from "@core/constants/core.constants";
import { gSchema$Event } from "@core/types/gcal";
import { mockGcal } from "@backend/__tests__/factories/gcal.factory";

const TEST_EVENT_ID = "test-event-id";

const mockRegularEvent: gSchema$Event = {
  id: TEST_EVENT_ID,
  summary: "Updated Event",
  status: "confirmed",
  htmlLink: "https://www.google.com/calendar/event?eid=test-event-id",
  created: "2025-03-19T10:32:57.036Z",
  updated: "2025-03-19T10:32:57.036Z",
  start: {
    dateTime: "2025-03-19T14:45:00-05:00",
    timeZone: "America/Chicago",
  },
  end: {
    dateTime: "2025-03-19T16:00:00-05:00",
    timeZone: "America/Chicago",
  },
  iCalUID: "test-event-id@google.com",
  sequence: 0,
  extendedProperties: {
    private: {
      origin: MockOrigin.GOOGLE_IMPORT,
      priority: MockPriorities.UNASSIGNED,
    },
  },
  reminders: {
    useDefault: true,
  },
  eventType: "default",
};

export const mockGcalEvents = () => {
  jest.mock("googleapis", () => {
    return mockGcal({
      events: [mockRegularEvent],
      nextSyncToken: "new-sync-token",
    });
  });
};
