import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const identify = mock();
const usePostHog = mock(() => ({ identify }));

mock.module("@web/auth/posthog/posthog-react", () => ({ usePostHog }));

const { useIdentifyUser } = await import("./useIdentifyUser");

describe("useIdentifyUser", () => {
  beforeEach(() => {
    identify.mockClear();
  });

  it("identifies with userId as the distinct_id and email as a property", () => {
    renderHook(() => useIdentifyUser("user@example.com", "user-123"));

    expect(identify).toHaveBeenCalledWith("user-123", {
      email: "user@example.com",
      user_id: "user-123",
    });
  });

  it("does not identify when userId or email is missing", () => {
    renderHook(() => useIdentifyUser(null, null));

    expect(identify).not.toHaveBeenCalled();
  });
});
