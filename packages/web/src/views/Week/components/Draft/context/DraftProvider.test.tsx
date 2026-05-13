import { render, waitFor } from "@testing-library/react";
import { useEffect, useRef } from "react";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Categories_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import {
  createInitialState,
  type InitialReduxState,
} from "@web/__tests__/utils/state/store.test.util";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { describe, expect, it, mock } from "bun:test";

const createDraft = (
  overrides: Partial<Schema_GridEvent> = {},
): Schema_GridEvent => ({
  _id: "event-1",
  title: "Seed event",
  startDate: "2024-01-15T10:00:00.000Z",
  endDate: "2024-01-15T11:30:00.000Z",
  isAllDay: false,
  isSomeday: false,
  origin: Origin.COMPASS,
  priority: Priorities.UNASSIGNED,
  user: "user-1",
  position: {
    isOverlapping: false,
    totalEventsInGroup: 1,
    widthMultiplier: 1,
    horizontalOrder: 1,
    dragOffset: { x: 0, y: 0 },
    initialX: null,
    initialY: null,
  },
  ...overrides,
});

const mockDispatch = mock();
let currentState: InitialReduxState = createInitialState();

mock.module("@web/store/store.hooks", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: InitialReduxState) => unknown) =>
    selector(currentState),
}));

mock.module("../hooks/effects/useDraftEffects", () => ({
  useDraftEffects: mock(),
}));

mock.module("@web/views/Forms/hooks/useEventForm", () => ({
  useEventForm: () => ({
    form: {},
  }),
}));

mock.module("../hooks/state/useDraftForm", () => ({
  useDraftForm: () => ({}),
}));

mock.module("../hooks/state/useDraftConfirmation", () => ({
  useDraftConfirmation: () => ({}),
}));

const { DraftProvider } =
  require("./DraftProvider") as typeof import("./DraftProvider");
const { useDraftContext } =
  require("./useDraftContext") as typeof import("./useDraftContext");

const weekProps = {
  component: {
    endOfView: dayjs("2024-01-21T23:59:59.999Z"),
    startOfView: dayjs("2024-01-15T00:00:00.000Z"),
    week: 3,
  },
  util: {
    getLastNavigationSource: () => "manual",
  },
};

describe("DraftProvider", () => {
  it("mirrors local React draft state into the interaction engine", async () => {
    const draft = createDraft();
    currentState = createInitialState();
    currentState.events.draft = {
      event: draft,
      status: {
        activity: "eventRightClick",
        dateToResize: null,
        eventType: Categories_Event.TIMED,
        isDrafting: true,
      },
    };

    let interaction:
      | ReturnType<typeof useDraftContext>["interaction"]
      | undefined;

    const Probe = () => {
      const context = useDraftContext();
      const didSeedDraft = useRef(false);
      interaction = context.interaction;

      useEffect(() => {
        if (didSeedDraft.current) return;
        didSeedDraft.current = true;

        context.setters.setDraft(draft);
        context.setters.setIsDragging(true);
      }, [context.setters]);

      return null;
    };

    render(
      <DraftProvider dateCalcs={{} as never} weekProps={weekProps as never}>
        <Probe />
      </DraftProvider>,
    );

    await waitFor(() => {
      expect(interaction?.getSnapshot()).toMatchObject({
        mode: "drag",
        draft,
      });
    });
  });
});
