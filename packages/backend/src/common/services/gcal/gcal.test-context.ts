import { type gCalendar } from "@core/types/gcal";

const testGcalByIsolationKey = new Map<string, gCalendar>();
let activeIsolationKey = "__unit__";

/** Called from test setup so parallel files resolve the correct mock client. */
export function setTestGcalIsolationKey(key: string): void {
  activeIsolationKey = key;
}

/** When set (tests only), createGoogleRequestContext uses this client instead of getGcalClient. */
export function getTestGcalOverride(): gCalendar | undefined {
  return testGcalByIsolationKey.get(activeIsolationKey);
}

export function runWithTestGcalClient<T>(gcal: gCalendar, fn: () => T): T {
  const previousKey = activeIsolationKey;
  const previousClient = testGcalByIsolationKey.get(previousKey);
  activeIsolationKey = previousKey;
  testGcalByIsolationKey.set(previousKey, gcal);
  try {
    return fn();
  } finally {
    if (previousClient === undefined) {
      testGcalByIsolationKey.delete(previousKey);
    } else {
      testGcalByIsolationKey.set(previousKey, previousClient);
    }
    activeIsolationKey = previousKey;
  }
}

export function enterTestGcalClient(gcal: gCalendar): void {
  testGcalByIsolationKey.set(activeIsolationKey, gcal);
}
