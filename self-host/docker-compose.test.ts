import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("self-host docker compose", () => {
  it("passes the Google webhook override to the backend container", () => {
    const compose = readFileSync(join(import.meta.dir, "docker-compose.yml"), {
      encoding: "utf8",
    });

    expect(compose).toContain(
      "GCAL_WEBHOOK_BASEURL: $".concat("{GCAL_WEBHOOK_BASEURL:-}"),
    );
  });
});
