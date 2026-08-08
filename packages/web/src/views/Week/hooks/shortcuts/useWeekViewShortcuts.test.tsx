import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { renderHook } from "@testing-library/react";
import { type PropsWithChildren } from "react";
import { pressKey } from "@web/__tests__/utils/keyboard.test.util";
import { useWeekViewShortcuts } from "./useWeekViewShortcuts";
import { describe, expect, it, mock } from "bun:test";

const wrapper = ({ children }: PropsWithChildren) => (
  <HotkeysProvider>{children}</HotkeysProvider>
);

describe("useWeekViewShortcuts", () => {
  it("invokes owner callbacks for week navigation and create keys", () => {
    const onPreviousWeek = mock();
    const onNextWeek = mock();
    const onCreateTimedDraft = mock();
    const onCreateAllDayDraft = mock();

    renderHook(
      () =>
        useWeekViewShortcuts({
          onPreviousWeek,
          onNextWeek,
          onCreateTimedDraft,
          onCreateAllDayDraft,
        }),
      { wrapper },
    );

    pressKey("j");
    pressKey("k");
    pressKey("c");
    pressKey("a");

    expect(onPreviousWeek).toHaveBeenCalledTimes(1);
    expect(onNextWeek).toHaveBeenCalledTimes(1);
    expect(onCreateTimedDraft).toHaveBeenCalledTimes(1);
    expect(onCreateAllDayDraft).toHaveBeenCalledTimes(1);
  });
});
