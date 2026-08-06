import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type Calendar } from "@core/types/calendar.contracts";
import { type GoogleSyncConnectionSummary } from "@core/types/user.types";
import { createTestToastPort } from "@web/__tests__/helpers/web-test-seams";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import { createMockCalendar } from "@web/__tests__/utils/factories/calendar.factory";
import { AuthApi } from "@web/api/auth.api";
import { userMetadataActions } from "@web/auth/state/user-metadata.store";
import { calendarQueryKeys } from "@web/calendars/calendar.query";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import {
  ACCOUNT_DISCONNECTED_TOAST_ID,
  GOOGLE_REVOKED_TOAST_ID,
} from "@web/common/constants/toast.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import {
  registerToastPort,
  resetToastPort,
} from "@web/common/utils/toast/toast.port";
import { settingsActions } from "@web/settings/settings.store";
import { afterAll, describe, expect, it, mock, spyOn } from "bun:test";

// mock.module is process-wide and not reliably restorable, so - as elsewhere
// in this suite of files - the real hook is captured up front and a flag
// (flipped in afterAll) decides which one runs.
const actualUseLogoutConfirmation = (
  await import("@web/components/LogoutConfirmation/hooks/useLogoutConfirmation")
).useLogoutConfirmation;
let isLogoutConfirmationMocked = true;
const mockOpenLogoutConfirmation = mock();
mock.module(
  "@web/components/LogoutConfirmation/hooks/useLogoutConfirmation",
  () => ({
    useLogoutConfirmation: (
      ...args: Parameters<typeof actualUseLogoutConfirmation>
    ) =>
      isLogoutConfirmationMocked
        ? {
            isOpen: false,
            closeLogoutConfirmation: mock(),
            openLogoutConfirmation: mockOpenLogoutConfirmation,
          }
        : actualUseLogoutConfirmation(...args),
  }),
);

// Other test files (e.g. useLogoutCmdItems.test.ts) also mock.module this
// same path without ever restoring it, so - regardless of load order - this
// module can already be permanently swapped to a foreign mock by the time
// this file runs. Mock it here too rather than relying on a real
// SessionContext.Provider, which that foreign mock would bypass entirely.
const actualUseSession = (await import("@web/auth/compass/session/useSession"))
  .useSession;
let isSessionMocked = true;
let authenticated = false;
mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: (...args: Parameters<typeof actualUseSession>) =>
    isSessionMocked
      ? { authenticated, setAuthenticated: mock() }
      : actualUseSession(...args),
}));

afterAll(() => {
  isLogoutConfirmationMocked = false;
  isSessionMocked = false;
});

const settingsModalUrl = new URL(
  `./SettingsModal.tsx?test=${Math.random().toString(36).slice(2)}`,
  import.meta.url,
);
const { SettingsModal } = (await import(
  settingsModalUrl.href
)) as typeof import("./SettingsModal");

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

const renderSettings = ({
  authenticated: isAuthenticated = false,
  connections = [connection()],
  calendars = [],
  open = true,
}: {
  authenticated?: boolean;
  connections?: GoogleSyncConnectionSummary[];
  calendars?: Calendar[];
  open?: boolean;
} = {}) => {
  authenticated = isAuthenticated;
  userMetadataActions.set({
    google: { connectionState: "HEALTHY", connections },
  });
  const { queryClient, wrapper } = createStoreWrapper();
  queryClient.setQueryData(calendarQueryKeys.all, calendars);
  if (open) settingsActions.openSettings();

  return { queryClient, ...render(<SettingsModal />, { wrapper }) };
};

describe("SettingsModal", () => {
  it("renders nothing while closed", () => {
    renderSettings({ open: false });

    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
  });

  it("lists every connected account with its own status", () => {
    renderSettings({
      connections: [
        connection(),
        connection({
          id: "connection-2",
          accountEmail: "ahab@gmail.com",
          state: "actionRequired",
          stateReason: "authorizationRevoked",
          connectionState: "RECONNECT_REQUIRED",
        }),
      ],
    });

    expect(screen.getByText("ahab@pequod.com")).toBeInTheDocument();
    expect(screen.getByText("ahab@gmail.com")).toBeInTheDocument();
    expect(screen.getByText("Calendar connected")).toBeInTheDocument();
    expect(screen.getByText("Calendar needs reconnecting")).toBeInTheDocument();
  });

  it("asks for confirmation before disconnecting", async () => {
    const disconnect = spyOn(
      AuthApi,
      "disconnectGoogleConnection",
    ).mockResolvedValue(undefined);

    const user = userEvent.setup({ delay: null });
    renderSettings();

    await user.click(
      screen.getByRole("button", { name: "Disconnect ahab@pequod.com" }),
    );

    // Disconnecting is not undoable without redoing the whole OAuth flow, so
    // the first press must not call the API.
    expect(disconnect).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", {
        name: "Confirm disconnecting ahab@pequod.com",
      }),
    ).toBeInTheDocument();

    disconnect.mockRestore();
  });

  it("disconnects that connection once confirmed", async () => {
    const disconnect = spyOn(
      AuthApi,
      "disconnectGoogleConnection",
    ).mockResolvedValue(undefined);

    const user = userEvent.setup({ delay: null });
    renderSettings({ connections: [connection({ id: "connection-second" })] });

    await user.click(
      screen.getByRole("button", { name: "Disconnect ahab@pequod.com" }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Confirm disconnecting ahab@pequod.com",
      }),
    );

    await waitFor(() => {
      expect(disconnect).toHaveBeenCalledWith("connection-second");
    });

    disconnect.mockRestore();
  });

  it("shows success toast and dismisses stale reconnect warning on disconnect", async () => {
    const { port: toastPort, mocks: toastMocks } = createTestToastPort();
    registerToastPort(toastPort);

    const disconnect = spyOn(
      AuthApi,
      "disconnectGoogleConnection",
    ).mockResolvedValue(undefined);

    const user = userEvent.setup({ delay: null });
    renderSettings({ connections: [connection({ id: "connection-third" })] });

    await user.click(
      screen.getByRole("button", { name: "Disconnect ahab@pequod.com" }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Confirm disconnecting ahab@pequod.com",
      }),
    );

    await waitFor(() => {
      expect(toastMocks.dismiss).toHaveBeenCalledWith(GOOGLE_REVOKED_TOAST_ID);
      expect(toastMocks.toast).toHaveBeenCalledWith(
        "Disconnected ahab@pequod.com",
        expect.objectContaining({ toastId: ACCOUNT_DISCONNECTED_TOAST_ID }),
      );
    });

    disconnect.mockRestore();
    resetToastPort();
  });

  it("backs out of the confirm without disconnecting", async () => {
    const disconnect = spyOn(
      AuthApi,
      "disconnectGoogleConnection",
    ).mockResolvedValue(undefined);

    const user = userEvent.setup({ delay: null });
    renderSettings();

    await user.click(
      screen.getByRole("button", { name: "Disconnect ahab@pequod.com" }),
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(disconnect).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Disconnect ahab@pequod.com" }),
    ).toBeInTheDocument();

    disconnect.mockRestore();
  });

  it("returns to the un-confirmed state when the disconnect fails", async () => {
    const disconnect = spyOn(
      AuthApi,
      "disconnectGoogleConnection",
    ).mockRejectedValue(new Error("nope"));

    const user = userEvent.setup({ delay: null });
    renderSettings();

    await user.click(
      screen.getByRole("button", { name: "Disconnect ahab@pequod.com" }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Confirm disconnecting ahab@pequod.com",
      }),
    );

    // A stuck "Disconnecting…" would read as a disconnect that half-happened.
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Disconnect ahab@pequod.com" }),
      ).toBeInTheDocument();
    });

    disconnect.mockRestore();
  });

  it("shows an empty state with no accounts connected", () => {
    renderSettings({ connections: [] });

    expect(screen.getByText("No accounts connected yet.")).toBeInTheDocument();
  });

  it("steps back out of an open confirm on Escape before closing the modal", async () => {
    const user = userEvent.setup({ delay: null });
    renderSettings();

    await user.click(
      screen.getByRole("button", { name: "Disconnect ahab@pequod.com" }),
    );
    expect(
      screen.getByRole("button", {
        name: "Confirm disconnecting ahab@pequod.com",
      }),
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(
      screen.getByRole("button", { name: "Disconnect ahab@pequod.com" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByText("Settings")).not.toBeInTheDocument();
  });

  it("shows the derived default calendar in the picker when nothing is stored", () => {
    const primary = createMockCalendar({ name: "Personal", isPrimary: true });
    const side = createMockCalendar({ name: "Side project" });

    renderSettings({ calendars: [primary, side] });

    expect(
      screen.getByRole("combobox", { name: "Default Calendar" }),
    ).toHaveValue(primary.id);
  });

  it("persists a new default calendar pick to storage", async () => {
    const primary = createMockCalendar({ name: "Personal", isPrimary: true });
    const side = createMockCalendar({ name: "Side project" });

    const user = userEvent.setup({ delay: null });
    renderSettings({ calendars: [primary, side] });

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Default Calendar" }),
      side.id,
    );

    expect(
      screen.getByRole("combobox", { name: "Default Calendar" }),
    ).toHaveValue(side.id);
    expect(persistentBrowserStore.get(STORAGE_KEYS.DEFAULT_CALENDAR_ID)).toBe(
      side.id,
    );
  });

  it("groups the picker by account even with a single account connected", () => {
    // Matches the sidebar, which gives a lone account the same labelled
    // section as several (no "only group past two accounts" threshold).
    const work = createMockCalendar({
      name: "Work",
      accountEmail: "ahab@pequod.com",
    });

    renderSettings({ calendars: [work] });

    const combobox = screen.getByRole("combobox", { name: "Default Calendar" });
    expect(
      within(combobox).getByRole("group", { name: "ahab@pequod.com" }),
    ).toBeInTheDocument();
  });

  it("lists the local calendar after the account groups when no account is connected", () => {
    // The sidebar renders account sections first and the local/ungrouped
    // calendar last; this picker used to disagree. With no account connected
    // the local calendar is still a legitimate writable target (see the next
    // test for the connected case).
    const work = createMockCalendar({
      name: "Work",
      accountEmail: "ahab@pequod.com",
    });
    const local = createMockCalendar({ name: "Compass", provider: "local" });

    renderSettings({ connections: [], calendars: [work, local] });

    const options = screen
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(options).toEqual(["Work", "Compass"]);
  });

  it("excludes the local calendar once an account is connected", () => {
    // Once any account is connected, new events belong on a provider
    // calendar - the local calendar drops out of the writable set entirely
    // rather than sorting last (local-calendar-visibility LCV2).
    const work = createMockCalendar({
      name: "Work",
      accountEmail: "ahab@pequod.com",
    });
    const local = createMockCalendar({ name: "Compass", provider: "local" });

    renderSettings({ calendars: [work, local] });

    const options = screen
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(options).toEqual(["Work"]);
  });

  it("restores the local calendar as a writable target once the only connected account is disconnected", async () => {
    // ensureLocalCalendar exists precisely so a disconnected user never loses
    // every writable calendar - LCV2's exclusion must lift the moment the
    // account it depends on is gone, not stay stuck excluding a calendar
    // nothing else can write to (local-calendar-visibility LCV5).
    const disconnect = spyOn(
      AuthApi,
      "disconnectGoogleConnection",
    ).mockResolvedValue(undefined);

    const work = createMockCalendar({
      name: "Work",
      accountEmail: "ahab@pequod.com",
    });
    const local = createMockCalendar({ name: "Compass", provider: "local" });

    const user = userEvent.setup({ delay: null });
    renderSettings({ calendars: [work, local] });

    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual(["Work"]);

    await user.click(
      screen.getByRole("button", { name: "Disconnect ahab@pequod.com" }),
    );
    await user.click(
      screen.getByRole("button", {
        name: "Confirm disconnecting ahab@pequod.com",
      }),
    );

    await waitFor(() => {
      expect(
        screen.getAllByRole("option").map((option) => option.textContent),
      ).toEqual(["Compass"]);
    });

    disconnect.mockRestore();
  });

  it("badges the account that owns the default calendar", () => {
    const work = createMockCalendar({
      name: "Work",
      isPrimary: true,
      accountEmail: "ahab@pequod.com",
    });

    renderSettings({
      connections: [
        connection(),
        connection({ id: "connection-2", accountEmail: "ahab@gmail.com" }),
      ],
      calendars: [work],
    });

    const pequodRow = screen.getByText("ahab@pequod.com").closest("div");
    expect(
      pequodRow ? within(pequodRow).getByText("Default") : null,
    ).toBeInTheDocument();
    const gmailRow = screen.getByText("ahab@gmail.com").closest("div");
    expect(
      gmailRow ? within(gmailRow).queryByText("Default") : null,
    ).not.toBeInTheDocument();
  });

  it("shows a Log out action for a signed-in user", async () => {
    const user = userEvent.setup({ delay: null });
    renderSettings({ authenticated: true });

    await user.click(screen.getByRole("button", { name: "Log out" }));
    expect(mockOpenLogoutConfirmation).toHaveBeenCalledTimes(1);
  });

  it("hides the Log out action for a signed-out (local-only) session", () => {
    renderSettings({ authenticated: false });

    expect(screen.queryByRole("button", { name: "Log out" })).toBeNull();
  });
});
