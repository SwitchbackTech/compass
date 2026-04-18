import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "bun:test";
import { type MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from "react";
import { CLIMB } from "@core/__mocks__/v1/events/events.misc";

function CalendarViewHarness() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (wrapperRef.current?.contains(target)) {
        return;
      }

      setIsFormOpen(false);
    };

    document.addEventListener("click", handleDocumentClick);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  const openForm = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsFormOpen(true);
  };

  return (
    <div ref={wrapperRef}>
      <button
        data-event-id={CLIMB._id}
        type="button"
        onClick={openForm}
      >
        {CLIMB.title}
      </button>
      {isFormOpen ? (
        <form aria-label="event form" role="form">
          <input aria-label="event title" />
        </form>
      ) : null}
    </div>
  );
}

describe("Event Form", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("closes after clicking outside", () => {
    render(<CalendarViewHarness />);

    const climbBtn = screen.getByRole("button", { name: CLIMB.title });

    fireEvent.click(climbBtn);
    expect(screen.getByRole("form")).toBeInTheDocument();

    fireEvent.click(document.body);

    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  describe("DatePicker", () => {
    it("does not open dialog by default", () => {
      const { container } = render(<CalendarViewHarness />);

      expect(container.getElementsByClassName("startDatePicker")).toHaveLength(
        0,
      );
    });
  });
});
