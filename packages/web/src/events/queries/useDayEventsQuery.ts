import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "@core/util/date/dayjs";
import { mergeSandboxEventData } from "@web/components/OnboardingTour/onboarding.sandbox-events";
import { useOnboardingSandboxEventData } from "@web/components/OnboardingTour/useOnboardingSandboxEvents";
import { deriveOverlappingEventQueryData } from "@web/events/queries/event.query.cache";
import { dayEventsQueryOptions } from "@web/events/queries/event.query.options";
import { useEventRepositorySource } from "@web/events/repositories/event.repository.source.store";
import { useCalendarEventViewModel } from "./useCalendarEventViewModel";
import { useEventListCalendarIds } from "./useEventListCalendarIds";

type DayEventsQueryArgs = {
  startDate: string;
  endDate: string;
};

export function useDayEventsQuery({ startDate, endDate }: DayEventsQueryArgs) {
  const queryClient = useQueryClient();
  const source = useEventRepositorySource();
  const calendarIds = useEventListCalendarIds();
  const query = useQuery({
    ...dayEventsQueryOptions({ source, startDate, endDate, calendarIds }),
    placeholderData: () =>
      deriveOverlappingEventQueryData(queryClient, {
        source,
        startDate,
        endDate,
      }),
  });
  return { ...query, calendarIds };
}

/**
 * `includeSandboxEvents` defaults false: this hook also backs the sidebar's
 * Up Next card (useUpNextEvent.ts), which queries "today" independent of
 * whichever view the tour actually has open - opt in only from the day
 * grid itself so a sandbox lesson's practice events never leak into a
 * component the tour isn't pointing at.
 */
export function useDayEventViewModel(
  args: DayEventsQueryArgs,
  options: { includeSandboxEvents?: boolean } = {},
) {
  const query = useDayEventsQuery(args);
  const sandboxData = useOnboardingSandboxEventData(
    options.includeSandboxEvents ? dayjs(args.startDate) : undefined,
  );
  const viewModel = useCalendarEventViewModel(
    mergeSandboxEventData(query.data, sandboxData),
  );
  return { ...query, ...viewModel };
}
