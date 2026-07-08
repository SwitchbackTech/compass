import { HotkeyManager, HotkeysProvider } from "@tanstack/react-hotkeys";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { type PropsWithChildren } from "react";
import { Origin, Priorities } from "@core/constants/core.constants";
import { type Schema_Event } from "@core/types/event.types";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import {
  undoHistoryActions,
  useUndoHistoryStore,
} from "@web/events/stores/undo.store";
import { useUndoRedoShortcuts } from "./useUndoRedoShortcuts";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

const before: Schema_Event = {
  _id: "event-1",
  title: "Before",
  origin: Origin.COMPASS,
  priority: Priorities.UNASSIGNED,
  isSomeday: false,
  startDate: "2026-07-02T16:00:00.000Z",
  endDate: "2026-07-02T17:00:00.000Z",
};

const editEntry = {
  kind: "edit" as const,
  _id: "event-1",
  before,
  after: { ...before, title: "After" },
};

const editMutations = (queryClient: QueryClient) =>
  queryClient
    .getMutationCache()
    .getAll()
    .filter((mutation) => mutation.options.mutationKey?.[2] === "edit")
    .map(
      (mutation) =>
        (mutation.state.variables as { event: Schema_Event }).event.title,
    );

const setup = () => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <HotkeysProvider>{children}</HotkeysProvider>
    </QueryClientProvider>
  );
  const hook = renderHook(() => useUndoRedoShortcuts(), { wrapper });
  return { hook, queryClient };
};

describe("useUndoRedoShortcuts", () => {
  beforeEach(() => {
    HotkeyManager.resetInstance();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("undoes the last change on Mod+Z", async () => {
    const { queryClient } = setup();
    undoHistoryActions.record(editEntry);

    act(() => {
      pressKey("z", { keyDownInit: { ctrlKey: true } });
    });

    await waitFor(() => {
      expect(editMutations(queryClient)).toEqual(["Before"]);
    });
    expect(useUndoHistoryStore.getState().past).toHaveLength(0);
    expect(useUndoHistoryStore.getState().future).toHaveLength(1);
  });

  it("redoes on Mod+Shift+Z without also undoing", async () => {
    const { queryClient } = setup();
    undoHistoryActions.record(editEntry);
    act(() => {
      pressKey("z", { keyDownInit: { ctrlKey: true } });
    });
    await waitFor(() => {
      expect(editMutations(queryClient)).toEqual(["Before"]);
    });

    act(() => {
      pressKey("z", { keyDownInit: { ctrlKey: true, shiftKey: true } });
    });

    await waitFor(() => {
      expect(editMutations(queryClient)).toEqual(["Before", "After"]);
    });
    expect(useUndoHistoryStore.getState().past).toHaveLength(1);
    expect(useUndoHistoryStore.getState().future).toHaveLength(0);
  });

  it("does not fire inside text inputs, preserving native text undo", () => {
    const { queryClient } = setup();
    undoHistoryActions.record(editEntry);
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    act(() => {
      pressKey("z", { keyDownInit: { ctrlKey: true } }, input);
    });

    expect(editMutations(queryClient)).toEqual([]);
    expect(useUndoHistoryStore.getState().past).toHaveLength(1);
  });
});
