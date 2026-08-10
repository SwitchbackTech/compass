import { type Dayjs } from "@core/util/date/dayjs";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { useDefaultTargetCalendar } from "@web/calendars/useDefaultTargetCalendar";
import { getBrowserTimeZone } from "@web/common/utils/datetime/web.date.util";
import { type NormalizedEventQueryData } from "@web/events/queries/event.query.types";
import { buildSandboxEventData } from "./onboarding.sandbox-events";
import {
  selectOnboardingTourActive,
  selectOnboardingTourStepId,
  useOnboardingTourStore,
} from "./onboarding.tour.store";

const NO_CALENDARS: never[] = [];

/**
 * Ephemeral practice events for the tour's sandbox steps (see
 * onboarding.sandbox-events.ts), or undefined outside of them. Merge into
 * real query data with {@link import("./onboarding.sandbox-events").mergeSandboxEventData}
 * before handing off to useCalendarEventViewModel - never written to
 * IndexedDB or the mutation pipeline.
 *
 * `anchor` is undefined when the caller opts out (e.g. a component that
 * isn't the tour's actual grid, like the Up Next card) - always call this
 * hook unconditionally and pass undefined rather than skipping the call, so
 * hook order stays stable.
 */
export function useOnboardingSandboxEventData(
  anchor: Dayjs | undefined,
): NormalizedEventQueryData | undefined {
  const isActive = useOnboardingTourStore(selectOnboardingTourActive);
  const stepId = useOnboardingTourStore(selectOnboardingTourStepId);
  const { data: calendars } = useCalendarsQuery();
  const defaultCalendar = useDefaultTargetCalendar(calendars ?? NO_CALENDARS);

  if (!isActive || !anchor || !defaultCalendar) return undefined;

  return buildSandboxEventData(
    stepId,
    anchor,
    defaultCalendar.id,
    getBrowserTimeZone(),
  );
}
