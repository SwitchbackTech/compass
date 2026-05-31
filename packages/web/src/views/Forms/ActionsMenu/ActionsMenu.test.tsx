import { fireEvent, render, screen } from "@testing-library/react";
import {
  type HTMLProps,
  type PropsWithChildren,
  type ReactElement,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { ThemeProvider } from "styled-components";
import { theme } from "@web/common/styles/theme";
import { afterEach, describe, expect, it, mock } from "bun:test";

let floatingOptions: { onOpenChange?: (open: boolean) => void } | null = null;

mock.module("@floating-ui/react", () => ({
  autoUpdate: mock(),
  flip: mock(() => ({})),
  FloatingFocusManager: ({
    children,
    closeOnFocusOut,
  }: PropsWithChildren<{ closeOnFocusOut?: boolean }>) => (
    <div
      onFocusCapture={(event) => {
        if (closeOnFocusOut === false) return;
        if (event.target !== event.currentTarget) {
          floatingOptions?.onOpenChange?.(false);
        }
      }}
    >
      {children}
    </div>
  ),
  FloatingPortal: ({ children }: PropsWithChildren) => <>{children}</>,
  offset: mock(() => ({})),
  shift: mock(() => ({})),
  useClick: mock(() => ({})),
  useDismiss: mock(() => ({})),
  useFloating: (options: { onOpenChange?: (open: boolean) => void }) => {
    floatingOptions = options;
    return {
      context: {
        floatingStyles: {},
      },
      refs: {
        setFloating: mock(),
        setReference: mock(),
      },
    };
  },
  useInteractions: mock(
    (
      interactions: Array<{
        getItemProps?: (
          props?: HTMLProps<HTMLElement>,
        ) => HTMLProps<HTMLElement>;
      }>,
    ) => ({
      getFloatingProps: (props = {}) => props,
      getItemProps: (props = {}) =>
        interactions.reduce(
          (itemProps, interaction) =>
            interaction.getItemProps?.(itemProps) ?? itemProps,
          props,
        ),
      getReferenceProps: (
        props: {
          onClick?: (event: ReactMouseEvent<HTMLDivElement>) => void;
        } = {},
      ) => ({
        ...props,
        onClick: (event: ReactMouseEvent<HTMLDivElement>) => {
          props.onClick?.(event);
          floatingOptions?.onOpenChange?.(true);
        },
      }),
    }),
  ),
  useListNavigation: mock((_context, props) => {
    const { focusItemOnHover } = props as { focusItemOnHover?: boolean };

    return {
      getItemProps: (userProps: HTMLProps<HTMLElement> = {}) => ({
        ...userProps,
        onMouseMove: (event: ReactMouseEvent<HTMLElement>) => {
          userProps.onMouseMove?.(event);

          if (focusItemOnHover !== false) {
            event.currentTarget.focus();
          }
        },
      }),
    };
  }),
  useRole: mock(() => ({})),
}));

mock.module("@web/common/hooks/useGridMaxZIndex", () => ({
  useGridMaxZIndex: () => 0,
}));

const { ActionsMenu, useMenuContext } =
  require("./ActionsMenu") as typeof import("./ActionsMenu");

const renderWithTheme = (ui: ReactElement) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

const TestMenuItem = () => {
  const menuContext = useMenuContext();
  const itemProps = menuContext?.getItemProps() ?? {};

  return (
    <button type="button" role="menuitem" {...itemProps}>
      Delete Event
    </button>
  );
};

describe("ActionsMenu", () => {
  afterEach(() => {
    floatingOptions = null;
  });

  it("keeps mouse hover from stealing focus from the editor action trigger", () => {
    renderWithTheme(
      <ActionsMenu bgColor="#fff">{() => <TestMenuItem />}</ActionsMenu>,
    );

    const trigger = screen.getByRole("button", { name: "Open actions menu" });
    trigger.focus();

    fireEvent.click(trigger);
    fireEvent.mouseMove(screen.getByRole("menuitem", { name: "Delete Event" }));

    expect(document.activeElement).toBe(trigger);
  });

  it("keeps the menu mounted when focus moves inside it", () => {
    renderWithTheme(
      <ActionsMenu bgColor="#fff">{() => <TestMenuItem />}</ActionsMenu>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open actions menu" }));
    fireEvent.focus(screen.getByRole("menuitem", { name: "Delete Event" }));

    expect(
      screen.getByRole("menuitem", { name: "Delete Event" }),
    ).toBeVisible();
  });
});
