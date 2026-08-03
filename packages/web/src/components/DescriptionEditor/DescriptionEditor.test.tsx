import { act, fireEvent, render, screen } from "@testing-library/react";
import { DescriptionEditor } from "@web/components/DescriptionEditor/DescriptionEditor";
import { describe, expect, it, mock } from "bun:test";

describe("DescriptionEditor", () => {
  it("exposes an accessible textbox and does not call onChange on mount", () => {
    const onChange = mock();
    render(
      <DescriptionEditor
        value="<p>Hello <b>world</b></p>"
        onChange={onChange}
        editable={true}
        resetKey="test-1"
      />,
    );

    expect(screen.getByRole("textbox", { name: "Description" })).toBeTruthy();
    // TipTap's `content` option is only read at editor creation - onUpdate
    // must not fire just from mounting with existing content, or the
    // dirty-check (DirtyParser.isGridDraftDirty) would show every opened
    // event as dirty before the user touches anything.
    expect(onChange).not.toHaveBeenCalled();
  });

  it("hides the toolbar and marks the textbox non-editable when read-only", () => {
    render(
      <DescriptionEditor
        value="<p>Hello</p>"
        onChange={mock()}
        editable={false}
        resetKey="test-2"
      />,
    );

    expect(screen.queryByRole("toolbar")).toBeNull();
    const textbox = screen.getByRole("textbox", {
      name: "Description",
    }) as HTMLElement;
    expect(textbox.getAttribute("contenteditable")).toBe("false");
  });

  it("toggles bold and reflects the pressed state on the toolbar button", () => {
    render(
      <DescriptionEditor
        value="<p>Hello</p>"
        onChange={mock()}
        editable={true}
        resetKey="test-3"
      />,
    );

    const boldButton = screen.getByRole("button", {
      name: "Bold",
    }) as HTMLButtonElement;
    expect(boldButton.getAttribute("aria-pressed")).toBe("false");

    act(() => {
      fireEvent.click(boldButton);
    });

    expect(boldButton.getAttribute("aria-pressed")).toBe("true");
  });

  it("strips disallowed tags from untrusted HTML before rendering", () => {
    render(
      <DescriptionEditor
        value='<p onclick="alert(1)">Safe text<script>alert(1)</script></p>'
        onChange={mock()}
        editable={false}
        resetKey="test-4"
      />,
    );

    const textbox = screen.getByRole("textbox", { name: "Description" });
    expect(textbox.innerHTML).not.toContain("<script");
    expect(textbox.innerHTML).not.toContain("onclick");
    expect(textbox.textContent).toContain("Safe text");
  });
});
