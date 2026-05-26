import { render, screen } from "@testing-library/react";
import { SomedaySectionHeader } from "./SomedaySectionHeader";
import { describe, expect, it } from "bun:test";

describe("SomedaySectionHeader", () => {
  it("reserves the count badge height when the column starts empty", () => {
    render(<SomedaySectionHeader count={0} label="This Week" />);

    const heading = screen.getByRole("heading", { name: "This Week" });

    expect(heading.parentElement?.classList.contains("min-h-[18px]")).toBe(
      true,
    );
    expect(screen.queryByText("0")).toBeNull();
  });

  it("shows the count badge without changing the header height", () => {
    render(<SomedaySectionHeader count={3} label="This Month" />);

    const heading = screen.getByRole("heading", { name: "This Month" });
    const badge = screen.getByText("3");

    expect(heading.parentElement?.classList.contains("min-h-[18px]")).toBe(
      true,
    );
    expect(badge.textContent).toBe("3 items");
    expect(badge.classList.contains("h-[18px]")).toBe(true);
  });
});
