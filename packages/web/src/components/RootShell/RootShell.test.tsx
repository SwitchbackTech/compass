import "@testing-library/jest-dom";
import { render, screen } from "@web/__tests__/__mocks__/mock.render";
import { createTestRouter } from "@web/__tests__/utils/providers/createTestRouter";
import { type AppAccess } from "@web/billing/useAppAccess";
import { RootShell } from "@web/components/RootShell/RootShell";
import { afterEach, describe, expect, it, mock } from "bun:test";

let access: AppAccess = { kind: "open" };

mock.module("@web/billing/useAppAccess", () => ({
  useAppAccess: () => access,
}));

describe("RootShell billing gates", () => {
  afterEach(() => {
    access = { kind: "open" };
  });

  const renderShell = async () => {
    const router = createTestRouter(<RootShell />);
    render(<div />, { router });
    await router.load();
  };

  it("shows the anonymous trial gate without the billing gate", async () => {
    access = { kind: "anonymous-trial", isExpired: true, daysLeft: 0 };
    await renderShell();

    expect(
      screen.getByRole("dialog", { name: "Your free trial has ended" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Manage billing" }),
    ).not.toBeInTheDocument();
  });

  it("shows the billing gate without the anonymous trial gate", async () => {
    access = {
      kind: "server",
      status: "awaiting_checkout",
      isReadOnly: true,
      trialEndsAt: null,
    };
    await renderShell();

    expect(
      screen.getByRole("dialog", { name: "Start your 7-day trial" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Your free trial has ended" }),
    ).not.toBeInTheDocument();
  });
});
