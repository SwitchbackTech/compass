import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "@web/components/ErrorBoundary/ErrorBoundary";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";

const mockCaptureException = mock();
const mockReload = mock();

// The boundary reports through the PostHog singleton (no hook), so stub the
// bootstrap accessor to observe the report without initializing PostHog.
mock.module("@web/auth/posthog/posthog.bootstrap", () => ({
  getPosthogClient: () => ({ captureException: mockCaptureException }),
}));

mock.module("@web/common/utils/browser/browser-navigation.util", () => ({
  reloadLocation: mockReload,
}));

const Boom = () => {
  throw new Error("render exploded");
};

describe("ErrorBoundary", () => {
  // React logs the caught error to console.error; silence it so the suite
  // output stays readable.
  let consoleError: ReturnType<typeof spyOn>;

  beforeEach(() => {
    mockCaptureException.mockClear();
    mockReload.mockClear();
    consoleError = spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it("renders the recovery surface instead of a blank page when a child throws", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(
      screen.getByRole("button", { name: /reload the app/i }),
    ).toBeInTheDocument();
  });

  it("reports the caught error to PostHog", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(mockCaptureException).toHaveBeenCalledTimes(1);
    const [error, properties] = mockCaptureException.mock.calls[0];
    expect((error as Error).message).toBe("render exploded");
    expect(properties).toMatchObject({
      $exception_source: "react-error-boundary",
    });
  });

  it("reloads the app when the recovery button is clicked", async () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: /reload the app/i }));

    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it("renders children untouched when nothing throws", () => {
    render(
      <ErrorBoundary>
        <span>all good</span>
      </ErrorBoundary>,
    );

    expect(screen.getByText("all good")).toBeInTheDocument();
    expect(mockCaptureException).not.toHaveBeenCalled();
  });
});
