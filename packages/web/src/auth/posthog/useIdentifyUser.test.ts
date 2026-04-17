import { type PostHog } from "posthog-js";
import "@testing-library/jest-dom";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockIdentify = mock();
const mockUsePostHog = mock();

mock.module("./posthog-react", () => ({
  PostHogProvider: ({ children }: { children?: unknown }) => children,
  usePostHog: mockUsePostHog,
}));

const { useIdentifyUser } =
  require("./useIdentifyUser") as typeof import("./useIdentifyUser");

function mockPostHogEnabled(overrides?: Partial<PostHog>): void {
  mockUsePostHog.mockReturnValue({
    identify: mockIdentify,
    ...overrides,
  } as unknown as PostHog);
}

function mockPostHogDisabled(): void {
  mockUsePostHog.mockReturnValue(undefined as unknown as PostHog);
}

describe("useIdentifyUser", () => {
  beforeEach(() => {
    mockIdentify.mockClear();
    mockUsePostHog.mockClear();
    mockPostHogEnabled();
  });

  it("calls posthog.identify when PostHog is enabled and user data is available", async () => {
    const testUserId = "test-user-123";
    const testEmail = "test@example.com";

    renderHook(() => useIdentifyUser(testEmail, testUserId));

    await waitFor(() => {
      expect(mockIdentify).toHaveBeenCalledWith(testEmail, {
        email: testEmail,
        userId: testUserId,
      });
    });
    expect(mockIdentify).toHaveBeenCalledTimes(1);
  });

  it("does not call posthog.identify when PostHog is disabled", async () => {
    mockPostHogDisabled();

    renderHook(() => useIdentifyUser("test@example.com", "user-1"));

    await waitFor(() => {
      expect(mockUsePostHog).toHaveBeenCalled();
    });

    expect(mockIdentify).not.toHaveBeenCalled();
  });

  it("does not call posthog.identify when email is null", async () => {
    renderHook(() => useIdentifyUser(null, "test-user-123"));

    await waitFor(() => {
      expect(mockUsePostHog).toHaveBeenCalled();
    });

    expect(mockIdentify).not.toHaveBeenCalled();
  });

  it("does not call posthog.identify when userId is null", async () => {
    renderHook(() => useIdentifyUser("test@example.com", null));

    await waitFor(() => {
      expect(mockUsePostHog).toHaveBeenCalled();
    });

    expect(mockIdentify).not.toHaveBeenCalled();
  });

  it("handles posthog.identify not being a function gracefully", async () => {
    mockPostHogEnabled({
      identify: null as unknown as PostHog["identify"],
    });

    expect(() => {
      renderHook(() => useIdentifyUser("test@example.com", "user-1"));
    }).not.toThrow();

    await waitFor(() => {
      expect(mockIdentify).not.toHaveBeenCalled();
    });
  });
});
