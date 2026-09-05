import { type EventId } from "@core/types/domain-primitives";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import {
  cleanup,
  fireEvent,
  render,
  renderHook,
  waitFor,
} from "@web/__tests__/__mocks__/mock.render";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { recurrenceScopeOpportunityActions } from "@web/events/recurrence/recurrence-scope-opportunity.store";
import { useShiftHoldEventHints } from "@web/shortcuts/shift-hint/useShiftHoldEventHints";
import { RecurrenceScopeOpportunityHost } from "./RecurrenceScopeOpportunityHost";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";

const occurrence = () =>
  createMockEvent({
    recurrence: {
      kind: "occurrence",
      seriesId: "0123456789abcdef11111111" as EventId,
    },
  });

const beginReadyAsk = () =>
  recurrenceScopeOpportunityActions.begin({
    kind: "delete",
    original: occurrence(),
    source: "local",
  });

const pressDigit = (value: "1" | "2") =>
  fireEvent.keyDown(document, { key: value, code: `Digit${value}` });

describe("RecurrenceScopeOpportunityHost", () => {
  beforeEach(() => {
    document.body.removeAttribute("data-app-locked");
    recurrenceScopeOpportunityActions.reset();
  });

  afterEach(() => {
    cleanup();
    recurrenceScopeOpportunityActions.reset();
  });

  it("promotes following with 1", async () => {
    const id = beginReadyAsk();
    const requestPromotion = spyOn(
      recurrenceScopeOpportunityActions,
      "requestPromotion",
    );

    render(<RecurrenceScopeOpportunityHost />);
    pressDigit("1");

    await waitFor(() => {
      expect(requestPromotion).toHaveBeenCalledWith(id, "thisAndFollowing");
    });
    requestPromotion.mockRestore();
  });

  it("promotes the live opportunity with 2", async () => {
    const id = beginReadyAsk();
    const requestPromotion = spyOn(
      recurrenceScopeOpportunityActions,
      "requestPromotion",
    );

    render(<RecurrenceScopeOpportunityHost />);
    pressDigit("2");

    await waitFor(() => {
      expect(requestPromotion).toHaveBeenCalledWith(id, "all");
    });
    requestPromotion.mockRestore();
  });

  it("does not steal 1 when no series-scope toast is live", () => {
    const requestPromotion = spyOn(
      recurrenceScopeOpportunityActions,
      "requestPromotion",
    );

    render(<RecurrenceScopeOpportunityHost />);
    pressDigit("1");

    expect(requestPromotion).not.toHaveBeenCalled();
    requestPromotion.mockRestore();
  });

  it("takes 1 from quick-time create while the toast is live", async () => {
    const id = beginReadyAsk();
    const requestPromotion = spyOn(
      recurrenceScopeOpportunityActions,
      "requestPromotion",
    );
    const createAt = mock((_start: Dayjs) => {});

    render(<RecurrenceScopeOpportunityHost />);
    renderHook(() =>
      useShiftHoldEventHints({
        createAtTime: createAt,
        focus: () => {},
        getQuickTimeDay: () => dayjs().startOf("day"),
        listVisible: () => [],
        timedEvents: [],
        visibleDays: [dayjs().startOf("day")],
      }),
    );

    pressDigit("1");

    await waitFor(() => {
      expect(requestPromotion).toHaveBeenCalledWith(id, "thisAndFollowing");
    });
    expect(createAt).not.toHaveBeenCalled();
    requestPromotion.mockRestore();
  });
});
