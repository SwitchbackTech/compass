import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { ActionsMenu } from "./ActionsMenu";

// Mock dependencies that require complex setup
jest.mock("@floating-ui/react", () => ({
  FloatingFocusManager: ({ children }: any) => <div>{children}</div>,
  FloatingPortal: ({ children }: any) => <div>{children}</div>,
  flip: jest.fn(),
  offset: jest.fn(),
  shift: jest.fn(),
  useClick: jest.fn(() => ({})),
  useDismiss: jest.fn(() => ({})),
  useFloating: jest.fn(() => ({
    x: 0,
    y: 0,
    refs: {
      setReference: jest.fn(),
      setFloating: jest.fn(),
    },
    strategy: "absolute",
    context: { open: false },
  })),
  useInteractions: jest.fn(() => ({
    getReferenceProps: jest.fn(() => ({})),
    getFloatingProps: jest.fn(() => ({})),
  })),
  useRole: jest.fn(() => ({})),
}));

jest.mock("@web/components/IconButton/IconButton", () => {
  return function MockIconButton({ children, ...props }: any) {
    return <button {...props}>{children}</button>;
  };
});

jest.mock("@phosphor-icons/react", () => ({
  DotsThreeVertical: () => <span>⋮</span>,
}));

describe("ActionsMenu ARIA Compliance", () => {
  it("should have proper ARIA attributes on trigger button", () => {
    render(
      <ActionsMenu id="test-menu">{() => <div>Menu content</div>}</ActionsMenu>,
    );

    const trigger = screen.getByLabelText("Open actions menu");

    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("id", "test-menu-trigger");
  });

  it("should generate consistent IDs for ARIA relationships", () => {
    render(
      <ActionsMenu id="custom-menu">
        {() => <div>Menu content</div>}
      </ActionsMenu>,
    );

    const trigger = screen.getByLabelText("Open actions menu");
    expect(trigger).toHaveAttribute("id", "custom-menu-trigger");
  });

  it("should use default ID when none provided", () => {
    render(<ActionsMenu>{() => <div>Menu content</div>}</ActionsMenu>);

    const trigger = screen.getByLabelText("Open actions menu");
    expect(trigger).toHaveAttribute("id", "event-actions-menu-trigger");
  });
});
