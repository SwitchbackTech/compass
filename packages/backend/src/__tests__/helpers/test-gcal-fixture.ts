import { getCurrentTestFileUrl } from "@backend/__tests__/helpers/test-file-context";
import { createMockCalendarListEntry as mockCalendarListCreate } from "@core/__tests__/helpers/gcal.factory";
import { type gSchema$CalendarListEntry } from "@core/types/gcal";
import { type gCalendar } from "@core/types/gcal";
import { mockAndCategorizeGcalEvents } from "@backend/__tests__/mocks.gcal/factories/gcal.event.batch";
import { createMockGcalClient } from "@backend/__tests__/mocks.gcal/factories/gcal.factory";

export interface TestGcalFixtureState {
  events: ReturnType<typeof mockAndCategorizeGcalEvents>;
  calendarlist: gSchema$CalendarListEntry[];
}

/**
 * Mutable in-memory Google Calendar fixture for tests. One instance per test
 * file (keyed by the calling test file URL) so parallel workers do not share state.
 */
export class TestGcalFixture {
  events: TestGcalFixtureState["events"];
  calendarlist: gSchema$CalendarListEntry[];

  constructor() {
    this.reset();
  }

  reset(): void {
    const fresh = TestGcalFixture.freshState();
    this.events = fresh.events;
    this.calendarlist = fresh.calendarlist;
  }

  createGcalClient(config?: Parameters<typeof createMockGcalClient>[1]): gCalendar {
    return createMockGcalClient(this, config);
  }

  static freshState(): TestGcalFixtureState {
    return {
      events: { ...mockAndCategorizeGcalEvents() },
      calendarlist: [mockCalendarListCreate()],
    };
  }
}

const fixturesByFile = new Map<string, TestGcalFixture>();

/** Per-file singleton so parallel test files never share gcal fixture state. */
export function getTestGcalFixture(): TestGcalFixture {
  const key = getCurrentTestFileUrl();
  let fixture = fixturesByFile.get(key);
  if (!fixture) {
    fixture = new TestGcalFixture();
    fixturesByFile.set(key, fixture);
  }
  return fixture;
}

/** @deprecated Use getTestGcalFixture() — kept for incremental migration. */
export function compassTestState(): TestGcalFixture {
  return getTestGcalFixture();
}
