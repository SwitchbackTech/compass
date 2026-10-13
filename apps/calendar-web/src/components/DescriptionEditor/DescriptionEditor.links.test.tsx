import { HotkeysProvider, resolveModifier } from "@tanstack/react-hotkeys";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createTestToastPort } from "@web/__tests__/helpers/web-test-seams";
import * as realEnvConstants from "@web/common/constants/env.constants";
import { registerToastPort } from "@web/common/utils/toast/toast.port";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from "bun:test";

const envConstantsSnapshot = { ...realEnvConstants };

const copyTextMock = mock(() => Promise.resolve(true));

mock.module("@web/common/utils/clipboard/clipboard.util", () => ({
  copyText: copyTextMock,
}));

const lastToastMessage = (toastMock: { mock: { calls: unknown[][] } }) => {
  const call = toastMock.mock.calls.at(-1);
  return call ? String(call[0]) : "";
};

async function renderDescriptionEditor(
  props: {
    value: string;
    resetKey: string;
    onChange?: ReturnType<typeof mock>;
  },
  options?: { withHotkeys?: boolean },
) {
  mock.module("@web/common/constants/env.constants", () => ({
    ...envConstantsSnapshot,
    IS_EVENT_SIDEBAR_STAGING_UX: true,
  }));
  const moduleUrl = new URL(
    `./DescriptionEditor.tsx?test=${Math.random().toString(36).slice(2)}`,
    import.meta.url,
  );
  const { DescriptionEditor } = await import(moduleUrl.href);
  const onChange = props.onChange ?? mock();
  const editor = (
    <DescriptionEditor
      value={props.value}
      onChange={onChange}
      editable={true}
      resetKey={props.resetKey}
    />
  );

  if (options?.withHotkeys) {
    return render(<HotkeysProvider>{editor}</HotkeysProvider>);
  }
  return render(editor);
}

afterAll(() => {
  mock.module(
    "@web/common/constants/env.constants",
    () => envConstantsSnapshot,
  );
});

describe("DescriptionEditor link staging UX", () => {
  beforeAll(() => {
    mock.module("@web/common/constants/env.constants", () => ({
      ...envConstantsSnapshot,
      IS_EVENT_SIDEBAR_STAGING_UX: true,
    }));
  });

  beforeEach(() => {
    document.body.removeAttribute("data-app-locked");
    copyTextMock.mockClear();
  });

  it("exposes keyboard-focusable links with a copy control and shortcut", async () => {
    const user = userEvent.setup();
    const { port, mocks } = createTestToastPort();
    registerToastPort(port);
    const meetingUrl = "https://example.com/meet";
    await renderDescriptionEditor(
      {
        value: `<p><a href="${meetingUrl}">Join</a></p>`,
        resetKey: "link-ux",
      },
      { withHotkeys: true },
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
    expect(
      lastToastMessage(mocks.toast as { mock: { calls: unknown[][] } }),
    ).toBe("Link copied");

    copyTextMock.mockClear();
    mocks.toast.mockClear();

    const modKey = resolveModifier("Mod") === "Meta" ? "Meta" : "Control";
    await user.keyboard(`{${modKey}>}{Shift>}c{/Shift}{/${modKey}}`);

    await waitFor(() => {
      expect(copyTextMock).toHaveBeenCalledWith(meetingUrl);
    });
    expect(
      lastToastMessage(mocks.toast as { mock: { calls: unknown[][] } }),
    ).toBe("Link copied");
  });

  it("still opens links on Mod+click without copying on a plain click", async () => {
    const openSpy = mock();
    const originalOpen = window.open;
    window.open = openSpy as typeof window.open;

    const meetingUrl = "https://compass.example/join";
    await renderDescriptionEditor({
      value: `<p><a href="${meetingUrl}">Join</a></p>`,
      resetKey: "mod-click",
    });

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
