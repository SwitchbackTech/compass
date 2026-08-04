import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type GoogleUiState } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.types";
import { describe, expect, it, mock } from "bun:test";

let mockState: GoogleUiState = "HEALTHY";
let mockIsAvailable = true;
let mockIsConnecting = false;
const mockConnect = mock();

mock.module("@web/auth/google/hooks/useConnectGoogle/useConnectGoogle", () => ({
  useConnectGoogle: () => ({
    connect: mockConnect,
    isAvailable: mockIsAvailable,
    isConnecting: mockIsConnecting,
    state: mockState,
  }),
}));

const { AddAccountButton } = await import("./AddAccountButton");

describe("AddAccountButton", () => {
  it("connects a new Google account on click, once a first account is healthy", async () => {
    mockState = "HEALTHY";
    mockIsAvailable = true;
    mockIsConnecting = false;
    const user = userEvent.setup({ delay: null });

    render(<AddAccountButton />);

    await user.click(screen.getByRole("button", { name: "Add account" }));
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it("also renders while a connection is importing", () => {
    mockState = "IMPORTING";
    mockIsAvailable = true;

    render(<AddAccountButton />);

    expect(
      screen.getByRole("button", { name: "Add account" }),
    ).toBeInTheDocument();
  });

  it("renders nothing before the first account is connected", () => {
    mockState = "NOT_CONNECTED";
    mockIsAvailable = true;

    render(<AddAccountButton />);

    expect(
      screen.queryByRole("button", { name: "Add account" }),
    ).not.toBeInTheDocument();
  });

  it("renders nothing when Google Calendar is not configured", () => {
    mockState = "HEALTHY";
    mockIsAvailable = false;

    render(<AddAccountButton />);

    expect(
      screen.queryByRole("button", { name: "Add account" }),
    ).not.toBeInTheDocument();
  });
});
