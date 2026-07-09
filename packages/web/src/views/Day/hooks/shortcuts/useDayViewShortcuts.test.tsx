import { HotkeyManager, HotkeysProvider } from "@tanstack/react-hotkeys";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { type PropsWithChildren } from "react";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import { useDayViewShortcuts } from "./useDayViewShortcuts";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const TASK_ID = "507f1f77bcf86cd799439011";

const wrapper = ({ children }: PropsWithChildren) => (
  <HotkeysProvider>{children}</HotkeysProvider>
);

const focusTaskCheckbox = () => {
  const checkbox = document.createElement("button");
  checkbox.setAttribute("role", "checkbox");
  checkbox.dataset.taskId = TASK_ID;
  document.body.appendChild(checkbox);
  checkbox.focus();
  return checkbox;
};

const focusReorderHandle = () => {
  const handle = document.createElement("button");
  handle.setAttribute("aria-label", "Reorder My task");
  handle.dataset.taskId = TASK_ID;
  document.body.appendChild(handle);
  handle.focus();
  return handle;
};

const pressMigrate = (key: "ArrowRight" | "ArrowLeft") =>
  pressKey(key, {
    keyDownInit: { shiftKey: true },
    keyUpInit: { shiftKey: true },
  });

beforeEach(() => {
  HotkeyManager.resetInstance();
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("useDayViewShortcuts create", () => {
  it("creates an all-day event with A", async () => {
    const onCreateAllDayEvent = mock();

    renderHook(() => useDayViewShortcuts({ onCreateAllDayEvent }), {
      wrapper,
    });
    pressKey("A");

    await waitFor(() => {
      expect(onCreateAllDayEvent).toHaveBeenCalled();
    });
  });

  it("does not create an all-day event when typing in an input", async () => {
    const onCreateAllDayEvent = mock();
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    renderHook(() => useDayViewShortcuts({ onCreateAllDayEvent }), {
      wrapper,
    });
    pressKey("A", {}, input);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onCreateAllDayEvent).not.toHaveBeenCalled();
  });
});

describe("useDayViewShortcuts migration", () => {
  it("migrates the focused task forward with Shift+ArrowRight", async () => {
    const onMigrateTask = mock();
    focusTaskCheckbox();

    renderHook(() => useDayViewShortcuts({ onMigrateTask }), { wrapper });
    pressMigrate("ArrowRight");

    await waitFor(() => {
      expect(onMigrateTask).toHaveBeenCalledWith(TASK_ID, "forward");
    });
  });

  it("migrates the focused task backward with Shift+ArrowLeft", async () => {
    const onMigrateTask = mock();
    focusTaskCheckbox();

    renderHook(() => useDayViewShortcuts({ onMigrateTask }), { wrapper });
    pressMigrate("ArrowLeft");

    await waitFor(() => {
      expect(onMigrateTask).toHaveBeenCalledWith(TASK_ID, "backward");
    });
  });

  it("migrates when the drag/reorder handle is focused", async () => {
    const onMigrateTask = mock();
    focusReorderHandle();

    renderHook(() => useDayViewShortcuts({ onMigrateTask }), { wrapper });
    pressMigrate("ArrowRight");

    await waitFor(() => {
      expect(onMigrateTask).toHaveBeenCalledWith(TASK_ID, "forward");
    });
  });

  it("does not migrate when no task is focused", async () => {
    const onMigrateTask = mock();

    renderHook(() => useDayViewShortcuts({ onMigrateTask }), { wrapper });
    pressMigrate("ArrowRight");

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onMigrateTask).not.toHaveBeenCalled();
  });

  it("keeps native Shift+Arrow selection inside a task input", async () => {
    const onMigrateTask = mock();
    const input = document.createElement("input");
    input.id = `task-input-${TASK_ID}`;
    document.body.appendChild(input);
    input.focus();

    renderHook(() => useDayViewShortcuts({ onMigrateTask }), { wrapper });
    pressKey(
      "ArrowRight",
      {
        keyDownInit: { shiftKey: true },
        keyUpInit: { shiftKey: true },
      },
      input,
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onMigrateTask).not.toHaveBeenCalled();
  });
});
