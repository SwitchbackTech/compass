import { CONFIG } from "@backend/common/constants/config.constants";
import { WELCOME_SEQUENCE_CONTENT } from "@backend/email/welcome-sequence.content";
import { describe, expect, it } from "bun:test";

const appUrl = CONFIG.FRONTEND_URL.replace(/\/$/, "");

// Settings is a modal in calendar-web, not a route, so every CTA must use a
// URL the app actually handles: the root or `?settings=<page>`. A `/settings/...` path renders the 404 view.
describe("welcome sequence content links", () => {
  it("sends every tip email to the app root", () => {
    for (const key of [
      "cmd-k",
      "shortcut-list",
      "jump-around",
      "adjusting-times",
      "roundup",
    ] as const) {
      expect(WELCOME_SEQUENCE_CONTENT[key].cta.href).toBe(appUrl);
    }
  });

  it("opens Settings > Billing from the trial-ending email", () => {
    expect(WELCOME_SEQUENCE_CONTENT["trial-ending"]?.cta.href).toBe(
      `${appUrl}/?settings=billing`,
    );
  });

  it("never links to a /settings path", () => {
    for (const entry of Object.values(WELCOME_SEQUENCE_CONTENT)) {
      expect(entry.cta.href).not.toContain("/settings");
    }
  });
});
