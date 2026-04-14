import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { render, waitFor } from "@testing-library/react";
import { type EventEmitter2 } from "eventemitter2";
import { Provider } from "react-redux";
import { useSession } from "@web/auth/compass/session/useSession";
import { useUser } from "@web/auth/compass/user/hooks/useUser";
import { importLatestSlice } from "@web/ducks/events/slices/sync.slice";
import SSEProvider from "./SSEProvider";

jest.mock("@web/auth/compass/session/useSession");
jest.mock("@web/auth/compass/user/hooks/useUser");
jest.mock("@web/auth/compass/user/util/user-metadata.util", () => ({
  refreshUserMetadata: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../client/sse.client", () => {
  const eventEmitterModule: {
    EventEmitter2: new (options?: { maxListeners?: number }) => EventEmitter2;
  } = jest.requireActual("eventemitter2");
  const { EventEmitter2 } = eventEmitterModule;
  const sseEmitter = new EventEmitter2({ maxListeners: 20 });
  return {
    openStream: jest.fn(),
    closeStream: jest.fn(),
    getStream: jest.fn(() => null),
    sseEmitter,
  };
});

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;

describe("SSEProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      authenticated: true,
      setAuthenticated: jest.fn(),
    });
    mockUseUser.mockReturnValue({ userId: "test-user-id" });
  });

  it("keeps the SSE stream open while authenticated even before the user id loads", async () => {
    mockUseUser.mockReturnValue({ userId: undefined });

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { closeStream, openStream } = require("../client/sse.client") as {
      closeStream: jest.Mock;
      openStream: jest.Mock;
    };

    render(
      <Provider
        store={configureStore({
          reducer: {
            sync: combineReducers({
              importLatest: importLatestSlice.reducer,
            }),
          },
        })}
      >
        <SSEProvider>
          <div>Test</div>
        </SSEProvider>
      </Provider>,
    );

    await waitFor(() => {
      expect(openStream).toHaveBeenCalled();
    });
    expect(closeStream).not.toHaveBeenCalled();
  });
});
