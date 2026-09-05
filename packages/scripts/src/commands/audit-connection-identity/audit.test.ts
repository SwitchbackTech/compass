import { parseAuditConnectionIdentityArgs } from "@scripts/commands/audit-connection-identity";
import { resolveProvidersToAudit } from "@scripts/commands/audit-connection-identity/audit";
import { describe, expect, it } from "bun:test";

describe("auditConnectionIdentity CLI args", () => {
  it("parses --provider microsoft from CLI argv", () => {
    expect(
      parseAuditConnectionIdentityArgs([
        "audit-connection-identity",
        "--provider",
        "microsoft",
      ]),
    ).toEqual({ provider: "microsoft" });
    expect(
      parseAuditConnectionIdentityArgs(["audit-connection-identity"]),
    ).toEqual({});
    expect(resolveProvidersToAudit(undefined)).toEqual([
      "google",
      "microsoft",
      "apple",
    ]);
  });
});
