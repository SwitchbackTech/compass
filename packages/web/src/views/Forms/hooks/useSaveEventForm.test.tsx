import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { type PropsWithChildren } from "react";
import {
  type Calendar,
  getCalendarCapabilities,
} from "@core/types/calendar.contracts";
import { CalendarIdSchema } from "@core/types/domain-primitives";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import {
  createGridEventDraft,
  timedGridSchedule,
} from "@web/events/grid-event-draft.adapter";
import {
  draftActions,
  initialDraftState,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { useSaveEventForm } from "./useSaveEventForm";
import { beforeEach, describe, expect, it } from "bun:test";

const calendarId = CalendarIdSchema.parse("cccccccccccccccccccccccc");

const makeCalendar = (overrides: Partial<Calendar> = {}): Calendar => ({
  id: calendarId,
  name: "Personal",
  description: "",
  timeZone: null,
  foregroundColor: "#000000",
  backgroundColor: "#3b82f6",
  provider: "local",
  access: "owner",
  capabilities: getCalendarCapabilities("owner"),
  isPrimary: true,
  isVisible: true,
  isActive: true,
  ...overrides,
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData(calendarQueryKeys.all, [makeCalendar()]);

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  return { queryClient, Wrapper };
}

describe("useSaveEventForm", () => {
  beforeEach(() => {
    draftActions.discard();
  });

  it("keeps the form open and surfaces field errors when the draft is invalid", () => {
    const draft = createGridEventDraft(
      timedGridSchedule(
        new Date("2026-05-20T10:00:00.000Z"),
        new Date("2026-05-20T09:00:00.000Z"),
      ),
      undefined,
      calendarId,
    );
    draftActions.startGridDraft({ activity: "gridClick", draft });
    draftActions.setFormOpen(true);

    const { queryClient, Wrapper } = createWrapper();
    const { result } = renderHook(() => useSaveEventForm(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.saveEventForm(draft);
    });

    expect(result.current.fieldErrors.end).toBeDefined();
    expect(queryClient.getMutationCache().getAll()).toHaveLength(0);
    expect(useDraftStore.getState().status?.isFormOpen).toBe(true);
    expect(useDraftStore.getState()).not.toEqual(initialDraftState);
  });

  it("creates an event with the draft closed via callback instead of after mutation returns", () => {
    const draft = createGridEventDraft(
      timedGridSchedule(
        new Date("2026-05-20T10:00:00.000Z"),
        new Date("2026-05-20T11:00:00.000Z"),
      ),
      undefined,
      calendarId,
    );
    draftActions.startGridDraft({ activity: "gridClick", draft });
    draftActions.setFormOpen(true);

    const { queryClient, Wrapper } = createWrapper();
    const { result } = renderHook(() => useSaveEventForm(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.saveEventForm(draft);
    });

    // A mutation should have been dispatched (the create was initiated).
    expect(queryClient.getMutationCache().getAll()).toHaveLength(1);
  });
});
