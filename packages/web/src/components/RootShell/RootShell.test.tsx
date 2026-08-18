import "@testing-library/jest-dom";
import { type ReactElement } from "react";
import { render, screen } from "@web/__tests__/__mocks__/mock.render";
import { createTestRouter } from "@web/__tests__/utils/providers/createTestRouter";
import { SessionContext } from "@web/auth/compass/session/session.context";
import { type AppAccess } from "@web/billing/useAppAccess";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { RootShell } from "@web/components/RootShell/RootShell";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from "bun:test";

const actualUseAppAccess = (await import("@web/billing/useAppAccess"))
  .useAppAccess;
let isAppAccessMocked = true;
let access: AppAccess = { kind: "open" };

mock.module("@web/billing/useAppAccess", () => ({
  useAppAccess: (...args: Parameters<typeof actualUseAppAccess>) =>
    isAppAccessMocked ? access : actualUseAppAccess(...args),
}));

const anonymousSession = {
  authenticated: false,
  setAuthenticated: () => {},
};

const renderShell = async (
  initialPath = "/",
  { anonymous = false }: { anonymous?: boolean } = {},
) => {
  const ui: ReactElement = anonymous ? (
    <SessionContext.Provider value={anonymousSession}>
      <RootShell />
    </SessionContext.Provider>
  ) : (
    <RootShell />
  );
  const router = createTestRouter(ui, {
    initialEntries: [initialPath],
  });
  render(<div />, { router });
  await router.load();
};

afterAll(() => {
  isAppAccessMocked = false;
});

describe("RootShell billing gates", () => {
  afterEach(() => {
    access = { kind: "open" };
  });

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
      screen.queryByRole("button", { name: "Manage billing" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Your free trial has ended" }),
    ).not.toBeInTheDocument();
  });
});

describe("RootShell calendar onboarding on /life", () => {
  beforeEach(() => {
    access = { kind: "open" };
  });

  it("does not show welcome or the practice card on /life, and does not burn flags", async () => {
    await renderShell("/life", { anonymous: true });

    expect(
      screen.queryByRole("dialog", { name: "Welcome to Compass Calendar" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("complementary", {
        name: "Shortcut practice checklist",
      }),
    ).not.toBeInTheDocument();
    expect(persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_WELCOME)).toBe(
      null,
    );
    expect(
      persistentBrowserStore.get(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE),
    ).toBe(null);
    expect(persistentBrowserStore.get(STORAGE_KEYS.CHECKLIST_DONE)).toBe(null);
  });

  it("still shows welcome on /week for a first-time anonymous visitor", async () => {
    await renderShell("/week", { anonymous: true });

    expect(
      screen.getByRole("dialog", { name: "Welcome to Compass Calendar" }),
    ).toBeInTheDocument();
  });

  it("hides an in-progress practice card on /life without dismissing it", async () => {
    persistentBrowserStore.set(STORAGE_KEYS.HAS_SEEN_WELCOME, "true");
    persistentBrowserStore.set(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE, "true");

    await renderShell("/life", { anonymous: true });

    expect(
      screen.queryByRole("complementary", {
        name: "Shortcut practice checklist",
      }),
    ).not.toBeInTheDocument();
    expect(persistentBrowserStore.get(STORAGE_KEYS.CHECKLIST_DONE)).toBe(null);
  });

  it("shows the practice card on /week after the showcase has been seen", async () => {
    persistentBrowserStore.set(STORAGE_KEYS.HAS_SEEN_WELCOME, "true");
    persistentBrowserStore.set(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE, "true");

    await renderShell("/week", { anonymous: true });

    expect(
      screen.getByRole("complementary", {
        name: "Shortcut practice checklist",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Practice on sample events")).toBeInTheDocument();
  });
});
