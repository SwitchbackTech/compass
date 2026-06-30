import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Categories_Event } from "@core/types/event.types";
import { afterEach, describe, expect, it } from "bun:test";
import "@testing-library/jest-dom";
import { useEventForm } from "./useEventForm";

afterEach(cleanup);

const EventFormHarness = ({ interactions }: { interactions: string[] }) => {
  const form = useEventForm(
    Categories_Event.TIMED,
    true,
    (_isOpen, _event, reason) => {
      if (reason === "outside-press") {
        interactions.push("dismiss form");
      }
    },
  );

  return (
    <>
      <dialog
        {...form.getFloatingProps()}
        aria-label="Event form"
        open
        ref={form.refs.setFloating}
      />
      <button
        onMouseDown={() => interactions.push("handle outside target")}
        type="button"
      >
        Outside target
      </button>
    </>
  );
};

describe("useEventForm", () => {
  it("lets an outside target handle mousedown before dismissing the form", async () => {
    const interactions: string[] = [];

    const user = userEvent.setup();
    render(<EventFormHarness interactions={interactions} />);

    await user.pointer({
      keys: "[MouseLeft>]",
      target: screen.getByRole("button", { name: "Outside target" }),
    });

    expect(interactions).toEqual(["handle outside target", "dismiss form"]);

    await user.pointer({ keys: "[/MouseLeft]" });
  });
});
