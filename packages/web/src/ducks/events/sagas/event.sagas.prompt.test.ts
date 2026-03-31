import { runSaga } from "redux-saga";
import { type Schema_Event } from "@core/types/event.types";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { session } from "@web/common/classes/Session";
import { getEventRepository } from "@web/common/repositories/event/event.repository.util";
import type * as SagaUtil from "@web/ducks/events/sagas/saga.util";
import { createEvent, editEvent } from "./event.sagas";

const mockHandleError = jest.fn<void, [unknown]>();
const mockMarkAnonymousCalendarChangeForSignUpPrompt = jest.fn<void, []>();
const mockCreateOptimisticGridEvent = jest.fn<
  Generator<unknown, Schema_Event, unknown>,
  unknown[]
>();

jest.mock("@web/common/classes/Session", () => ({
  session: {
    doesSessionExist: jest.fn(),
  },
}));

jest.mock("@web/common/repositories/event/event.repository.util", () => ({
  getEventRepository: jest.fn(),
}));

jest.mock("@web/auth/google/state/google.auth.state", () => ({
  isGoogleRevoked: jest.fn<boolean, []>(() => false),
}));

jest.mock("@web/auth/compass/state/auth.state.util", () => ({
  hasUserEverAuthenticated: jest.fn<boolean, []>(() => false),
  markAnonymousCalendarChangeForSignUpPrompt: (): void => {
    mockMarkAnonymousCalendarChangeForSignUpPrompt();
  },
}));

jest.mock("@web/common/utils/event/event.util", () => ({
  handleError: (...args: [unknown]) => mockHandleError(...args),
}));

jest.mock("@web/ducks/events/sagas/saga.util", () => {
  const actual: typeof SagaUtil = jest.requireActual(
    "@web/ducks/events/sagas/saga.util",
  );

  return {
    ...actual,
    _createOptimisticGridEvent: (...args: unknown[]) =>
      mockCreateOptimisticGridEvent(...args),
  };
});

describe("event sign-up prompt failure paths", () => {
  const mockEvent = {
    ...createMockStandaloneEvent(),
    _id: "event-1",
    isSomeday: false,
  } as Schema_Event;

  beforeEach(() => {
    jest.clearAllMocks();
    (session.doesSessionExist as jest.Mock).mockResolvedValue(false);
    // eslint-disable-next-line require-yield
    mockCreateOptimisticGridEvent.mockImplementation(function* () {
      return mockEvent;
    });
  });

  it("does not mark the sign-up prompt when anonymous create fails", async () => {
    const repository = {
      create: jest.fn().mockRejectedValue(new Error("create failed")),
      delete: jest.fn().mockResolvedValue(undefined),
      edit: jest.fn(),
    };
    (getEventRepository as jest.Mock).mockReturnValue(repository);

    await runSaga(
      {
        dispatch: jest.fn(),
        getState: () => ({
          events: {
            entities: { value: {} },
            pendingEvents: { eventIds: [] },
          },
        }),
      },
      createEvent,
      { payload: mockEvent } as never,
    ).toPromise();

    expect(
      mockMarkAnonymousCalendarChangeForSignUpPrompt,
    ).not.toHaveBeenCalled();
  });

  it("does not mark the sign-up prompt when anonymous edit fails", async () => {
    const repository = {
      create: jest.fn(),
      delete: jest.fn(),
      edit: jest.fn().mockRejectedValue(new Error("edit failed")),
    };
    (getEventRepository as jest.Mock).mockReturnValue(repository);

    await runSaga(
      {
        dispatch: jest.fn(),
        getState: () => ({
          events: {
            entities: {
              value: {
                [mockEvent._id]: mockEvent,
              },
            },
            pendingEvents: { eventIds: [] },
          },
        }),
      },
      editEvent,
      {
        payload: {
          _id: mockEvent._id,
          event: {
            ...mockEvent,
            title: "Updated Title",
          },
        },
      } as never,
    ).toPromise();

    expect(
      mockMarkAnonymousCalendarChangeForSignUpPrompt,
    ).not.toHaveBeenCalled();
  });
});
