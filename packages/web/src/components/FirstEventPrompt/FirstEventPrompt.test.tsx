import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { FirstEventPrompt } from "@web/components/FirstEventPrompt/FirstEventPrompt";
import {
  initialFirstEventPromptState,
  noteFirstRealEventCreated,
  useFirstEventPromptStore,
} from "@web/components/FirstEventPrompt/first-event.store";
import {
  initialShortcutShowcaseState,
  useShortcutShowcaseStore,
} from "@web/components/ShortcutShowcase/showcase.store";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

const markShowcaseSeen = () => {
  persistentBrowserStore.set(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE, "true");
};

describe("FirstEventPrompt", () => {
  beforeEach(() => {
    useFirstEventPromptStore.setState({ ...initialFirstEventPromptState });
    useShortcutShowcaseStore.setState(initialShortcutShowcaseState);
    persistentBrowserStore.set(STORAGE_KEYS.FIRST_EVENT_DONE, "");
    persistentBrowserStore.set(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE, "");
    localStorage.setItem("compass.onboarding.checklist-done", "");
  });

  afterEach(() => {
    useFirstEventPromptStore.setState({ ...initialFirstEventPromptState });
    useShortcutShowcaseStore.setState(initialShortcutShowcaseState);
  });

  it("stays hidden before the showcase has ever been seen", () => {
    render(<FirstEventPrompt />);
    expect(
      screen.queryByRole("complementary", { name: "Create your first event" }),
    ).toBeNull();
  });

  it("stays hidden while the showcase takeover is active", () => {
    markShowcaseSeen();
    useShortcutShowcaseStore.setState({ isActive: true });
    render(<FirstEventPrompt />);
    expect(
      screen.queryByRole("complementary", { name: "Create your first event" }),
    ).toBeNull();
  });

  it("shows the handoff copy and a C keycap once the showcase has been seen", () => {
    markShowcaseSeen();
    render(<FirstEventPrompt />);

    const prompt = screen.getByRole("complementary", {
      name: "Create your first event",
    });
    expect(prompt).toBeTruthy();
    expect(screen.getByText("You've got the skills")).toBeTruthy();
    expect(screen.getByText(/to create your first real event/)).toBeTruthy();
    expect(screen.getByText("C")).toBeTruthy();
  });

  it("celebrates on the first real event, then retires the card for good", async () => {
    markShowcaseSeen();
    render(<FirstEventPrompt />);

    act(() => noteFirstRealEventCreated());
    expect(screen.getByText("That's a real one.")).toBeTruthy();
    expect(persistentBrowserStore.get(STORAGE_KEYS.FIRST_EVENT_DONE)).toBe(
      "completed",
    );

    await waitFor(
      () => {
        expect(
          screen.queryByRole("complementary", {
            name: "Create your first event",
          }),
        ).toBeNull();
      },
      { timeout: 5000 },
    );
  });

  it("dismiss fades the card out, then hides it and persists the choice", async () => {
    const user = userEvent.setup();
    markShowcaseSeen();
    render(<FirstEventPrompt />);

    const prompt = screen.getByRole("complementary", {
      name: "Create your first event",
    });
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    // Fades out (matching UpNextBanner) rather than vanishing instantly.
    expect(prompt).toHaveAttribute("data-closing");

    await waitFor(() => {
      expect(
        screen.queryByRole("complementary", {
          name: "Create your first event",
        }),
      ).toBeNull();
    });
    expect(persistentBrowserStore.get(STORAGE_KEYS.FIRST_EVENT_DONE)).toBe(
      "dismissed",
    );
  });

  it("stays hidden once done, regardless of how it got there", () => {
    useFirstEventPromptStore.setState({
      ...initialFirstEventPromptState,
      isDone: true,
    });
    markShowcaseSeen();
    render(<FirstEventPrompt />);
    expect(
      screen.queryByRole("complementary", { name: "Create your first event" }),
    ).toBeNull();
  });
});
