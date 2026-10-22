import { mockModuleForFile } from "@web/__tests__/utils/mock-module.test.util";
import * as trackModule from "@web/auth/posthog/track";
import {
  resetEmptyGridClickHintTelemetryForTests,
  trackEmptyGridClickHintShown,
} from "@web/views/Week/pointer-intent/empty-grid-click-hint.telemetry";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const track = mock();

mockModuleForFile("@web/auth/posthog/track", trackModule, { track });

describe("empty-grid-click-hint telemetry", () => {
  beforeEach(() => {
    track.mockClear();
    resetEmptyGridClickHintTelemetryForTests();
  });

  afterEach(() => {
    resetEmptyGridClickHintTelemetryForTests();
  });

  it("tracks throttled empty_grid_click_hint_shown for grid slot intents", () => {
    trackEmptyGridClickHintShown("slot-click");
    trackEmptyGridClickHintShown("slot-click");

    expect(
      track.mock.calls.filter(
        ([event]) => event === "empty_grid_click_hint_shown",
      ),
    ).toHaveLength(1);
  });

  it("ignores non-grid intents", () => {
    trackEmptyGridClickHintShown("card-click");
    expect(track).not.toHaveBeenCalled();
  });
});
