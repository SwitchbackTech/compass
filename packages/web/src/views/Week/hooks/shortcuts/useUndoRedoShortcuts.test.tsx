import { HotkeyManager, HotkeysProvider } from "@tanstack/react-hotkeys";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { type PropsWithChildren } from "react";
import { type ReplaceEventInput } from "@core/types/event-command.contracts";
import { createMockEvent } from "@web/__tests__/utils/factories/event.factory";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import {
  undoHistoryActions,
  useUndoHistoryStore,
} from "@web/events/stores/undo.store";
import { useUndoRedoShortcuts } from "./useUndoRedoShortcuts";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

const before = createMockEvent({
  content: { kind: "details", title: "Before", description: "" },
});

const editEntry = {
  kind: "edit" as const,
  id: before.id,
  before,
  after: {
    ...before,
    content: { kind: "details" as const, title: "After", description: "" },
  },
};

const editMutations = (queryClient: QueryClient) =>
  queryClient
    .getMutationCache()
    .getAll()
    .filter((mutation) => mutation.options.mutationKey?.[2] === "replace")
    .map((mutation) => {
      const { input } = mutation.state.variables as {
        input: ReplaceEventInput;
      };
      return input.content.kind === "details" ? input.content.title : null;
    });

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
