import { describe, expect, it, mock } from "bun:test";
import "@testing-library/jest-dom";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "styled-components";
import { theme } from "@web/common/styles/theme";
import {
  CompassDOMEvents,
  compassEventEmitter,
} from "@web/common/utils/dom/event-emitter.util";
import { TaskDescription } from "./TaskDescription";

function renderTaskDescription({
  description = "",
  onSave = mock(),
}: {
  description?: string;
  onSave?: (description: string) => void;
} = {}) {
  render(
    <ThemeProvider theme={theme}>
      <TaskDescription description={description} onSave={onSave} />
    </ThemeProvider>,
  );

  return { onSave };
}

describe("TaskDescription", () => {
  it("saves the edited description from a visible save button", async () => {
    const user = userEvent.setup();
    const onSave = mock();
    renderTaskDescription({ description: "Old notes", onSave });

    await user.click(screen.getByText("Old notes"));
    const descriptionInput = screen.getByPlaceholderText(
      "Add a description...",
    );

    await user.clear(descriptionInput);
    await user.type(descriptionInput, "New notes");
    await user.click(screen.getByRole("button", { name: /save description/i }));

    expect(onSave).toHaveBeenCalledWith("New notes");
    await waitFor(() => {
      expect(screen.getByText("New notes")).toBeInTheDocument();
    });
  });

  it("shows the keyboard shortcut on the save button tooltip", async () => {
    const user = userEvent.setup();
    renderTaskDescription({ description: "Notes" });

    await user.click(screen.getByText("Notes"));
    const saveButton = screen.getByRole("button", {
      name: /save description/i,
    });

    await user.hover(saveButton);

    await waitFor(() => {
      expect(screen.getByText("Mod+Enter")).toBeInTheDocument();
    });
  });

  it("saves the edited description from the keyboard save shortcut", async () => {
    const user = userEvent.setup();
    const onSave = mock();
    renderTaskDescription({ description: "Old notes", onSave });

    await user.click(screen.getByText("Old notes"));
    const descriptionInput = screen.getByPlaceholderText(
      "Add a description...",
    );

    await user.clear(descriptionInput);
    await user.type(descriptionInput, "New notes");
    act(() => {
      compassEventEmitter.emit(CompassDOMEvents.SAVE_TASK_DESCRIPTION);
    });

    expect(onSave).toHaveBeenCalledWith("New notes");
    await waitFor(() => {
      expect(screen.getByText("New notes")).toBeInTheDocument();
    });
  });
});
