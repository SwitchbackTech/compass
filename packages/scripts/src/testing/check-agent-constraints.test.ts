import {
  BARREL_ALLOWLIST,
  duplicateEventSchemaHits,
  isBarrelSource,
  locatorHits,
  MONGO_SERVICE_TEST_ALLOWLIST,
  matchesConstraintAllow,
  matchGlob,
  mongoServiceImportHits,
  scanConstraints,
  WEB_LOCATOR_ALLOWLIST,
} from "./check-agent-constraints";
import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("isBarrelSource", () => {
  it("treats export-from index modules as barrels", () => {
    expect(isBarrelSource('export { Foo } from "./Foo";\n')).toBe(true);
    expect(isBarrelSource('export * from "./widgets";\n')).toBe(true);
  });

  it("treats import-then-named-export as a barrel", () => {
    expect(
      isBarrelSource('import { Foo } from "./Foo";\nexport { Foo };\n'),
    ).toBe(true);
  });

  it("does not treat the web app entry as a barrel", () => {
    expect(
      isBarrelSource(`
import { initPosthog } from "@web/auth/posthog/posthog.bootstrap";
initPosthog();
void import("./app.bootstrap");
`),
    ).toBe(false);
  });

  it("does not treat router config that defines its own exports as a barrel", () => {
    expect(
      isBarrelSource(`
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "@web/routers/router.routes";
export const router = createRouter({ routeTree });
`),
    ).toBe(false);
  });
});

describe("locatorHits", () => {
  it("flags RTL getByTestId and querySelector", () => {
    expect(locatorHits('screen.getByTestId("x");\n')).toEqual([1]);
    expect(locatorHits('container.querySelector(".foo");\n')).toEqual([1]);
  });

  it("does not flag production data-* attributes", () => {
    expect(locatorHits('<div data-state="open" />\n')).toEqual([]);
  });
});

describe("mongoServiceImportHits", () => {
  it("flags backend mongoService imports", () => {
    expect(
      mongoServiceImportHits(
        'import mongoService from "@backend/common/services/mongo.service";\n',
      ),
    ).toEqual([1]);
  });

  it("does not flag sync-mongo.service", () => {
    expect(
      mongoServiceImportHits(
        'import { type SyncMongoService } from "@sync/storage/sync-mongo.service";\n',
      ),
    ).toEqual([]);
  });
});

describe("duplicateEventSchemaHits", () => {
  it("flags a local EventSchema zod object", () => {
    expect(
      duplicateEventSchemaHits(
        "const EventSchema = z.object({\n  title: z.string(),\n});\n",
      ),
    ).toEqual([1]);
  });

  it("does not flag CompassEventSchema from core", () => {
    expect(
      duplicateEventSchemaHits(
        'import { CompassEventSchema } from "@compass/core/types/compass-event.contracts";\n',
      ),
    ).toEqual([]);
  });
});

describe("scanConstraints", () => {
  it("fails a new barrel, locator, mongoService import, and duplicate schema", () => {
    const root = mkdtempSync(join(tmpdir(), "agent-constraints-"));
    writeTree(root, {
      "packages/web/src/foo/index.ts": 'export { Foo } from "./Foo";\n',
      "packages/web/src/index.tsx":
        'import { init } from "@web/auth/posthog/posthog.bootstrap";\nvoid import("./app.bootstrap");\n',
      "packages/web/src/Widget.test.tsx": 'screen.getByTestId("x");\n',
      "packages/web/src/Widget.tsx": '<div data-state="open" />\n',
      "packages/backend/src/new.service.test.ts":
        'import mongoService from "@backend/common/services/mongo.service";\n',
      "packages/web/src/dup.ts":
        "const EventSchema = z.object({ title: z.string() });\n",
    });

    const hits = scanConstraints(root).map((hit) => `${hit.rule}:${hit.path}`);
    expect(hits).toContain("barrel:packages/web/src/foo/index.ts");
    expect(hits).toContain("web-locator:packages/web/src/Widget.test.tsx");
    expect(hits).toContain(
      "mongoService-import:packages/backend/src/new.service.test.ts",
    );
    expect(hits).toContain("duplicate-event-schema:packages/web/src/dup.ts");
    expect(hits.some((hit) => hit.includes("packages/web/src/index.tsx"))).toBe(
      false,
    );
    expect(
      hits.some((hit) => hit.includes("packages/web/src/Widget.tsx")),
    ).toBe(false);
  });

  it("does not require checker edits for new provider test files", () => {
    const root = mkdtempSync(join(tmpdir(), "provider-tests-"));
    writeTree(root, {
      "packages/web/src/index.tsx":
        'import { init } from "@web/auth/posthog/posthog.bootstrap";\nvoid import("./app.bootstrap");\n',
      "packages/sync/src/providers/microsoft/x.test.ts":
        'describe("x", () => {\n  it("ok", () => {\n    expect(true).toBe(true);\n  });\n});\n',
      "packages/web/src/auth/providers/y.test.tsx":
        'it("renders a named control", () => {\n  expect("Save").toBe("Save");\n});\n',
    });

    const hits = scanConstraints(root);
    expect(
      hits.filter(
        (hit) =>
          hit.path.includes("providers/microsoft") ||
          hit.path.includes("auth/providers"),
      ),
    ).toEqual([]);
  });

  it("still flags locators in new web tests outside documented globs", () => {
    const root = mkdtempSync(join(tmpdir(), "locator-new-"));
    writeTree(root, {
      "packages/web/src/index.tsx":
        'import { init } from "@web/auth/posthog/posthog.bootstrap";\nvoid import("./app.bootstrap");\n',
      "packages/web/src/auth/providers/y.test.tsx":
        'screen.getByTestId("provider-row");\n',
    });

    expect(
      scanConstraints(root).map((hit) => `${hit.rule}:${hit.path}`),
    ).toContain("web-locator:packages/web/src/auth/providers/y.test.tsx");
  });
});

describe("constraint allowlist globs", () => {
  it("matches nested shortcut tests and not auth provider tests", () => {
    expect(
      matchGlob(
        "packages/web/src/shortcuts/edit-sequence/EditSequenceMenu.test.tsx",
        "packages/web/src/shortcuts/**/*.test.tsx",
      ),
    ).toBe(true);
    expect(
      matchesConstraintAllow(
        "packages/web/src/auth/providers/y.test.tsx",
        WEB_LOCATOR_ALLOWLIST,
      ),
    ).toBe(false);
    expect(
      matchesConstraintAllow(
        "packages/web/src/views/Forms/EventForm/EventForm.readOnly.test.tsx",
        WEB_LOCATOR_ALLOWLIST,
      ),
    ).toBe(true);
    expect(
      matchesConstraintAllow(
        "packages/web/src/views/Forms/EventForm/DateControlsSection/RecurrenceSection/RecurrenceSection.test.tsx",
        WEB_LOCATOR_ALLOWLIST,
      ),
    ).toBe(true);
  });

  it("covers backend db tests and the mongoService unit test", () => {
    expect(
      matchesConstraintAllow(
        "packages/backend/src/billing/billing.guard.db.test.ts",
        MONGO_SERVICE_TEST_ALLOWLIST,
      ),
    ).toBe(true);
    expect(
      matchesConstraintAllow(
        "packages/backend/src/common/services/mongo.service.test.ts",
        MONGO_SERVICE_TEST_ALLOWLIST,
      ),
    ).toBe(true);
    expect(
      matchesConstraintAllow(
        "packages/backend/src/new.service.test.ts",
        MONGO_SERVICE_TEST_ALLOWLIST,
      ),
    ).toBe(false);
  });

  it("keeps allowlists empty or glob entries with a reason", () => {
    expect(BARREL_ALLOWLIST).toEqual([]);
    for (const entry of [
      ...WEB_LOCATOR_ALLOWLIST,
      ...MONGO_SERVICE_TEST_ALLOWLIST,
    ]) {
      expect(entry.glob.includes("*")).toBe(true);
      expect(entry.reason.length).toBeGreaterThan(0);
    }
  });
});

function writeTree(root: string, files: Record<string, string>): void {
  for (const [rel, source] of Object.entries(files)) {
    const path = join(root, rel);
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, source);
  }
}
