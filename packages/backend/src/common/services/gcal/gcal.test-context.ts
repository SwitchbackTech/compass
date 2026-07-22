import { AsyncLocalStorage } from "node:async_hooks";
import { type gCalendar } from "@core/types/gcal";

const testGcalStorage = new AsyncLocalStorage<gCalendar>();

/** When set (tests only), createGoogleRequestContext uses this client instead of getGcalClient. */
export function getTestGcalOverride(): gCalendar | undefined {
  return testGcalStorage.getStore();
}

export function runWithTestGcalClient<T>(gcal: gCalendar, fn: () => T): T {
  return testGcalStorage.run(gcal, fn);
}

export function enterTestGcalClient(gcal: gCalendar): void {
  testGcalStorage.enterWith(gcal);
}
