import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type GoogleSyncConnectionSummary } from "@core/types/user.types";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import { toggleAccountCollapsed } from "@web/calendars/collapsed-accounts.store";
import { AccountSectionHeader } from "./AccountSectionHeader";
import { describe, expect, it } from "bun:test";

const connection = (
  overrides: Partial<GoogleSyncConnectionSummary> = {},
): GoogleSyncConnectionSummary => ({
  id: "connection-1",
  state: "healthy",
  stateReason: null,
  lastSyncedAt: null,
  lastHealthyAt: null,
  accountEmail: "ahab@pequod.com",
  connectionState: "HEALTHY",
  ...overrides,
});

const renderHeader = (summary = connection()) => {
  const { wrapper } = createStoreWrapper();
  return render(
    <AccountSectionHeader
      accountEmail={summary.accountEmail ?? "ahab@pequod.com"}
      connection={summary}
    />,
    { wrapper },
  );
};

describe("AccountSectionHeader", () => {
  it("expands by default, and toggles aria-expanded on click", async () => {
    const user = userEvent.setup({ delay: null });
    renderHeader();

    const toggle = screen.getByRole("button", { name: "ahab@pequod.com" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("starts collapsed when the account's key is already in the collapsed store", () => {
    toggleAccountCollapsed("ahab@pequod.com");

    renderHeader();

    expect(
      screen.getByRole("button", { name: "ahab@pequod.com" }),
    ).toHaveAttribute("aria-expanded", "false");
  });
});
