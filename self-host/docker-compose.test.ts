import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("self-host docker compose", () => {
  it("mounts compass.yaml into the backend container", () => {
    const compose = readFileSync(join(import.meta.dir, "compose.yaml"), {
      encoding: "utf8",
    });

    expect(compose).toContain("COMPASS_CONFIG_FILE: /app/compass.yaml");
    expect(compose).toContain(
      "- $".concat(
        "{COMPASS_CONFIG_FILE:-./compass.yaml}:/app/compass.yaml:ro",
      ),
    );
  });
});
