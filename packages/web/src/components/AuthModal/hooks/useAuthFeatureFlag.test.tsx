import { renderHook } from "@testing-library/react";
import { markUserAsAuthenticated } from "@web/auth/compass/state/auth.state.util";
import { useAuthFeatureFlag } from "./useAuthFeatureFlag";

const setWindowLocation = (url: string) => {
  const urlObj = new URL(url, "http://localhost");
  Object.defineProperty(window, "location", {
    value: {
      pathname: urlObj.pathname,
      search: urlObj.search,
      hash: urlObj.hash,
    },
    writable: true,
    configurable: true,
  });
};

describe("useAuthFeatureFlag", () => {
  beforeEach(() => {
    localStorage.clear();
    setWindowLocation("/day");
  });

  it("returns true when the auth query param is present", () => {
    setWindowLocation("/day?auth=login");

    const { result } = renderHook(() => useAuthFeatureFlag());

    expect(result.current).toBe(true);
  });

  it("returns true when a last known email exists", () => {
    markUserAsAuthenticated("test@example.com");

    const { result } = renderHook(() => useAuthFeatureFlag());

    expect(result.current).toBe(true);
  });

  it("returns false when there is no auth query param or stored email", () => {
    const { result } = renderHook(() => useAuthFeatureFlag());

    expect(result.current).toBe(false);
  });
});
