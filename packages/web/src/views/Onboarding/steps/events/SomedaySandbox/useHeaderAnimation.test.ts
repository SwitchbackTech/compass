import { act } from "react";
import { renderHook } from "@testing-library/react";
import { useHeaderAnimation } from "./useHeaderAnimation";

it.skip("should set header animation to false after 2.5 seconds", () => {
  const { result } = renderHook(() => useHeaderAnimation());

  expect(result.current.isHeaderAnimating).toBe(true);

  act(() => {
    jest.advanceTimersByTime(2500);
  });

  expect(result.current.isHeaderAnimating).toBe(false);
});
