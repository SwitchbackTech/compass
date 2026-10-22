import { render, screen } from "@testing-library/react";
import {
  initialFirstEventPromptState,
  useFirstEventPromptStore,
} from "@web/components/FirstEventPrompt/first-event.store";
import { useEventFormFocusStore } from "@web/shortcuts/tips/event-form-focus.store";
import { EventFormFooterTips } from "@web/views/Forms/EventForm/SaveSection/EventFormFooterTips";
import { beforeEach, describe, expect, it } from "bun:test";

describe("EventFormFooterTips", () => {
  beforeEach(() => {
    useFirstEventPromptStore.setState(initialFirstEventPromptState, true);
    useEventFormFocusStore.setState(
      {
        focusInsideForm: true,
        tabNavigationApplies: true,
        syncFromDocument: useEventFormFocusStore.getState().syncFromDocument,
        resetForTests: useEventFormFocusStore.getState().resetForTests,
      },
      true,
    );
  });

  it("shows tab navigation and the Mod+0 actions tip while focus is in the form", () => {
    useFirstEventPromptStore.setState({ isDone: true }, false);
    render(<EventFormFooterTips />);

    const tips = screen.getByTestId("event-form-footer-tips");
    expect(tips.textContent).toContain("between fields");
    expect(tips.textContent).toContain("0 for actions");
  });

  it("hides tab navigation when an overlay traps Tab", () => {
    useFirstEventPromptStore.setState({ isDone: true }, false);
    useEventFormFocusStore.setState({ tabNavigationApplies: false }, false);
    render(<EventFormFooterTips />);

    const tips = screen.getByTestId("event-form-footer-tips");
    expect(tips.textContent).not.toContain("between fields");
    expect(tips.textContent).toContain("0 for actions");
  });
});
