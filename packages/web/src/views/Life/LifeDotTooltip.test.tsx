import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LifeDotTooltip } from "./LifeDotTooltip";
import { describe, expect, it } from "bun:test";

describe("LifeDotTooltip", () => {
  it("shows the year and week label when clicked", async () => {
    const user = userEvent.setup();
    render(
      <LifeDotTooltip weekNumber={105}>
        <span>Dot 105</span>
      </LifeDotTooltip>,
    );

    await user.click(screen.getByRole("button", { name: "Dot 105" }));

    await waitFor(() => {
      expect(screen.getByText("Year 3, Week 1")).toBeInTheDocument();
    });
  });
});
