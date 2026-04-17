import { runSaga } from "redux-saga";
import { type Schema_Event } from "@core/types/event.types";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import {
  clearAnonymousCalendarChangeSignUpPrompt,
  shouldShowAnonymousCalendarChangeSignUpPrompt,
} from "@web/auth/compass/state/auth.state.util";
import { session } from "@web/common/classes/Session";
import { LocalEventRepository } from "@web/common/repositories/event/local.event.repository";
import { editEventSlice } from "@web/ducks/events/slices/event.slice";
import { createEvent, editEvent } from "./event.sagas";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";

describe("event sign-up prompt failure paths", () => {
  const mockEvent = {
    ...createMockStandaloneEvent(),
    _id: "event-1",
    isSomeday: false,
  } as Schema_Event;

  let createSpy: { mockRestore: () => void } | null = null;
  let consoleErrorSpy: { mockRestore: () => void };
  let deleteSpy: { mockRestore: () => void };
  let doesSessionExistSpy: { mockRestore: () => void };
  let editSpy: { mockRestore: () => void } | null = null;
  let alertSpy: { mockRestore: () => void };
  const originalEditError = editEventSlice.actions.error;

  beforeEach(() => {
    clearAnonymousCalendarChangeSignUpPrompt();
    createSpy = null;
    editSpy = null;
    consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
    alertSpy = spyOn(globalThis, "alert").mockImplementation(() => {});
    editEventSlice.actions.error = (() => ({
      type: "async/editEvent/error",
    })) as typeof editEventSlice.actions.error;
    deleteSpy = spyOn(
      LocalEventRepository.prototype,
      "delete",
    ).mockResolvedValue(undefined);
    doesSessionExistSpy = spyOn(session, "doesSessionExist").mockResolvedValue(
      false,
    );
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    createSpy?.mockRestore();
    deleteSpy.mockRestore();
    doesSessionExistSpy.mockRestore();
    editSpy?.mockRestore();
    alertSpy.mockRestore();
    editEventSlice.actions.error = originalEditError;
    clearAnonymousCalendarChangeSignUpPrompt();
  });

  it("does not mark the sign-up prompt when anonymous create fails", async () => {
    createSpy = spyOn(
      LocalEventRepository.prototype,
      "create",
    ).mockImplementation(async () => {
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
    editSpy = spyOn(LocalEventRepository.prototype, "edit").mockImplementation(
      async () => {
        throw new Error("edit failed");
      },
    );

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
