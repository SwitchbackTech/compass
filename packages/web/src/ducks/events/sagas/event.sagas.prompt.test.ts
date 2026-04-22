import { runSaga } from "redux-saga";
import { type Schema_Event } from "@core/types/event.types";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import {
  clearAnonymousCalendarChangeSignUpPrompt,
  shouldShowAnonymousCalendarChangeSignUpPrompt,
} from "@web/auth/compass/state/auth.state.util";
import { session } from "@web/common/classes/Session";
import { editEventSlice } from "@web/ducks/events/slices/event.slice";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";

const mockRepository = {
  create: mock(),
  delete: mock(),
  edit: mock(),
};

const mockGetEventRepository = mock(() => mockRepository);
const mockSelectEventById = mock();

mock.module("@web/common/repositories/event/event.repository.util", () => ({
  getEventRepository: mockGetEventRepository,
}));

mock.module("@web/ducks/events/selectors/event.selectors", () => ({
  selectEventById: mockSelectEventById,
}));

const { createEvent, editEvent } =
  require("./event.sagas") as typeof import("./event.sagas");

describe("event sign-up prompt failure paths", () => {
  const mockEvent = {
    ...createMockStandaloneEvent(),
    _id: "event-1",
    isSomeday: false,
  } as Schema_Event;

  let consoleErrorSpy: { mockRestore: () => void };
  let doesSessionExistSpy: { mockRestore: () => void };
  const originalEditError = editEventSlice.actions.error;

  beforeEach(() => {
    clearAnonymousCalendarChangeSignUpPrompt();
    mockGetEventRepository.mockClear();
    mockRepository.create.mockClear();
    mockRepository.delete.mockClear();
    mockRepository.edit.mockClear();
    mockSelectEventById.mockClear();
    mockSelectEventById.mockReturnValue(mockEvent);
    consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
    editEventSlice.actions.error = (() => ({
      type: "async/editEvent/error",
    })) as typeof editEventSlice.actions.error;
    doesSessionExistSpy = spyOn(session, "doesSessionExist").mockResolvedValue(
      false,
    );
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    doesSessionExistSpy.mockRestore();
    editEventSlice.actions.error = originalEditError;
    clearAnonymousCalendarChangeSignUpPrompt();
  });

  it("does not mark the sign-up prompt when anonymous create fails", async () => {
    mockRepository.create.mockImplementation(async () => {
      throw new Error("create failed");
    });

    await runSaga(
      {
        dispatch: mock(),
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

    expect(shouldShowAnonymousCalendarChangeSignUpPrompt()).toBe(false);
  });

  it("does not mark the sign-up prompt when anonymous edit fails", async () => {
    mockRepository.edit.mockImplementation(async () => {
      throw new Error("edit failed");
    });

    await runSaga(
      {
        dispatch: mock(),
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

    expect(shouldShowAnonymousCalendarChangeSignUpPrompt()).toBe(false);
  });
});
