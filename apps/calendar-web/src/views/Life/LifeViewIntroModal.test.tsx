import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  LIFE_VIEW_INTRO_PRIMARY_LABEL,
  LIFE_VIEW_INTRO_TITLE,
} from "@web/views/Life/life-view-intro.util";
import { afterEach, describe, expect, it, mock } from "bun:test";

const dismiss = mock();

const { LifeViewIntroModal } =
  require("./LifeViewIntroModal") as typeof import("./LifeViewIntroModal");

const dialog = { name: LIFE_VIEW_INTRO_TITLE };

const introProps = {
  mounted: true,
  closing: false,
  dismiss,
};

describe("LifeViewIntroModal", () => {
  afterEach(() => {
    cleanup();
    dismiss.mockClear();
  });

  it("dismisses from the primary button", async () => {
    const user = userEvent.setup();
    render(<LifeViewIntroModal {...introProps} />);
    expect(screen.getByRole("dialog", dialog)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: LIFE_VIEW_INTRO_PRIMARY_LABEL }),
    );
    expect(dismiss).toHaveBeenCalledWith("primary");
  });

  it("dismisses on Enter", async () => {
    const user = userEvent.setup();
    render(<LifeViewIntroModal {...introProps} />);
    await user.keyboard("{Enter}");
    expect(dismiss).toHaveBeenCalledWith("primary");
  });

  it("dismisses on Escape", async () => {
    const user = userEvent.setup();
    render(<LifeViewIntroModal {...introProps} />);
    await user.keyboard("{Escape}");
    expect(dismiss).toHaveBeenCalledWith("escape");
  });
});
