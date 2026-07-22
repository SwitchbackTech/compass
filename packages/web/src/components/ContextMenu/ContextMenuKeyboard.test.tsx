import { useFloating } from "@floating-ui/react";
import { useEffect } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@web/__tests__/__mocks__/mock.render";
import { type GridEvent } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import { ContextMenu } from "@web/components/ContextMenu/ContextMenu";
import { type ContextMenuItemsActions } from "@web/components/ContextMenu/ContextMenuItems";
import {
  CONTEXT_MENU_FLOATING_OPTIONS,
  contextMenuStyle,
  cursorReference,
} from "@web/components/ContextMenu/contextMenu.floating";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";
import "@testing-library/jest-dom";

const gridEvent = {
  _id: "evt-1",
  title: "Standup",
  position: gridEventDefaultPosition,
} as unknown as GridEvent;

const actions: ContextMenuItemsActions = {
  delete: mock(),
  duplicate: mock(),
  edit: mock(),
};

// Mirrors how the day/week wrappers mount the menu: a virtual cursor reference
// and an externally-controlled `open`, which is exactly the flow where
// floating-ui's own initialFocus is skipped.
const OpenMenuHarness = ({
  onClose = () => {},
  open = true,
}: {
  onClose?: () => void;
  open?: boolean;
}) => {
  const { context, refs, floatingStyles } = useFloating({
    ...CONTEXT_MENU_FLOATING_OPTIONS,
    open,
    onOpenChange: (next) => {
      if (!next) onClose();
    },
  });

  useEffect(() => {
    refs.setReference(cursorReference(10, 10));
  }, [refs]);

  if (!open) return null;

  return (
    <ContextMenu
      actions={actions}
      close={onClose}
      context={context}
      event={gridEvent}
      onOutsideClick={onClose}
      ref={refs.setFloating}
      style={contextMenuStyle(floatingStyles)}
    />
  );
};

const getMenu = () => screen.getByRole("menu");

let queuedTimers: (() => void)[];
let setTimeoutSpy: ReturnType<typeof spyOn>;

beforeEach(() => {
  queuedTimers = [];
  setTimeoutSpy = spyOn(globalThis, "setTimeout").mockImplementation(((
    callback: TimerHandler,
  ) => {
    if (typeof callback === "function") {
      queuedTimers.push(callback as () => void);
    }
    return 0;
  }) as typeof setTimeout);
});

// The menu seats focus on a deferred + retried timeout (the portalled menu
// isn't focusable during the synchronous commit). Flush that queue directly
// rather than waiting through its retry window in real time.
const flushFocusSeat = () =>
  act(() => {
    while (queuedTimers.length > 0) queuedTimers.shift()?.();
  });

describe("ContextMenu keyboard operability", () => {
  afterEach(() => {
    setTimeoutSpy.mockRestore();
    cleanup();
  });

  it("moves focus into the menu (first item) when it opens", async () => {
    render(<OpenMenuHarness />);
    flushFocusSeat();

    expect(screen.getByRole("menuitem", { name: "Edit" })).toHaveFocus();
  });

  it("returns focus to the opener when the menu closes", async () => {
    const opener = document.createElement("button");
    opener.textContent = "opener";
    document.body.appendChild(opener);
    opener.focus();

    const { rerender } = render(<OpenMenuHarness open />);
    flushFocusSeat();
    expect(screen.getByRole("menuitem", { name: "Edit" })).toHaveFocus();

    rerender(<OpenMenuHarness open={false} />);
    expect(opener).toHaveFocus();

    opener.remove();
  });

  it("navigates between items with the arrow keys", () => {
    render(<OpenMenuHarness />);

    const menu = getMenu();
    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(screen.getByRole("menuitem", { name: "Duplicate" })).toHaveFocus();

    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();

    fireEvent.keyDown(menu, { key: "ArrowUp" });
    expect(screen.getByRole("menuitem", { name: "Duplicate" })).toHaveFocus();
  });

  it("exposes the menu with valid menu -> menuitem semantics", () => {
    render(<OpenMenuHarness />);

    expect(getMenu()).toBeInTheDocument();
    expect(screen.getAllByRole("menuitem")).toHaveLength(3);
  });
});
