import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { SomedaySectionHeader } from "./SomedaySectionHeader";
import { describe, expect, it } from "bun:test";

describe("SomedaySectionHeader", () => {
  it("renders the section label without a zero badge when empty", () => {
    render(<SomedaySectionHeader count={0} label="This Week" />);

    expect(screen.getByRole("heading", { name: "This Week" })).toBeVisible();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("renders a count badge with accessible item text", () => {
    render(<SomedaySectionHeader count={3} label="This Month" />);

    expect(screen.getByRole("heading", { name: "This Month" })).toBeVisible();
    expect(screen.getByText("3")).toHaveTextContent("3 items");
  });
});
