import { act, renderHook } from "@testing-library/react";
import { useDebouncedValue } from "@web/common/hooks/useDebouncedValue";
import { describe, expect, it } from "bun:test";

const advance = async (ms: number) => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
};

describe("useDebouncedValue", () => {
  it("returns the initial value right away", () => {
    const { result } = renderHook(() => useDebouncedValue("dent", 50));

    expect(result.current).toBe("dent");
  });

  it("holds a new value back until the delay passes", async () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 50),
      { initialProps: { value: "d" } },
    );

    rerender({ value: "dent" });
    expect(result.current).toBe("d");

    await advance(80);
    expect(result.current).toBe("dent");
  });

  it("keeps only the last value when changes arrive within the delay", async () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value, 50),
      { initialProps: { value: "d" } },
    );

    rerender({ value: "de" });
    await advance(10);
    rerender({ value: "dent" });
    await advance(10);
    expect(result.current).toBe("d");

    await advance(80);
    expect(result.current).toBe("dent");
  });
});
