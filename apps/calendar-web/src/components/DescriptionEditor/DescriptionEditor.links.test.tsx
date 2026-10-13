import { beforeEach, describe, expect, it, mock } from "bun:test";

const copyTextMock = mock(() => Promise.resolve(true));
mock.module("@web/common/utils/clipboard/clipboard.util", () => ({
  copyText: copyTextMock,
}));

import { HotkeysProvider, resolveModifier } from "@tanstack/react-hotkeys";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createTestToastPort } from "@web/__tests__/helpers/web-test-seams";
import { registerToastPort } from "@web/common/utils/toast/toast.port";
import { DescriptionEditor } from "@web/components/DescriptionEditor/DescriptionEditor";

const lastToastMessage = (toastMock: { mock: { calls: unknown[][] } }) => {
  const call = toastMock.mock.calls.at(-1);
  return call ? String(call[0]) : "";
};

describe("DescriptionEditor link staging UX", () => {
  beforeEach(() => {
    document.body.removeAttribute("data-app-locked");
    copyTextMock.mockClear();
  });

  it("exposes keyboard-focusable links with a copy control and shortcut", async () => {
    const user = userEvent.setup();
    const { port, mocks } = createTestToastPort();
    registerToastPort(port);
    const meetingUrl = "https://example.com/meet";
    render(
      <HotkeysProvider>
        <DescriptionEditor
          value={`<p><a href="${meetingUrl}">Join</a></p>`}
          onChange={mock()}
          editable={true}
          resetKey="link-ux"
        />
      </HotkeysProvider>,
    );

    const link = screen.getByRole("link", { name: "Join" });
    expect(link).toHaveAttribute("tabindex", "0");

    link.focus();
    expect(link).toHaveFocus();

    const copyButton = await waitFor(() =>
      screen.getByRole("button", { name: "Copy link" }),
    );
    await user.click(copyButton);
    expect(copyTextMock).toHaveBeenCalledWith(meetingUrl);
    expect(lastToastMessage(mocks.toast)).toBe("Link copied");

    copyTextMock.mockClear();
    mocks.toast.mockClear();

    const modKey = resolveModifier("Mod") === "Meta" ? "Meta" : "Control";
    await user.keyboard(`{${modKey}>}{Shift>}c{/Shift}{/${modKey}}`);

    await waitFor(() => {
      expect(copyTextMock).toHaveBeenCalledWith(meetingUrl);
    });
    expect(lastToastMessage(mocks.toast)).toBe("Link copied");
  });

  it("still opens links on Mod+click without copying on a plain click", () => {
    const openSpy = mock();
    const originalOpen = window.open;
    window.open = openSpy as typeof window.open;

    const meetingUrl = "https://compass.example/join";
    render(
      <DescriptionEditor
        value={`<p><a href="${meetingUrl}">Join</a></p>`}
        onChange={mock()}
        editable={true}
        resetKey="mod-click"
      />,
    );

    const link = screen.getByRole("link", { name: "Join" });
    fireEvent.click(link);
    expect(openSpy).not.toHaveBeenCalled();

    const modClick =
      resolveModifier("Mod") === "Control"
        ? { ctrlKey: true }
        : { metaKey: true };
    fireEvent.click(link, modClick);
    expect(openSpy).toHaveBeenCalled();

    window.open = originalOpen;
  });
});
