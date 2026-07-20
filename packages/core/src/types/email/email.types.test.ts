import { EmailUpdatesResponseSchema } from "./email.types";
import { describe, expect, it } from "bun:test";

describe("EmailUpdatesResponseSchema", () => {
  it.each([
    "unavailable",
    "not_subscribed",
    "subscribed",
  ])("accepts %s", (status) => {
    expect(EmailUpdatesResponseSchema.safeParse({ status }).success).toBe(true);
  });

  it("rejects an unknown status", () => {
    expect(
      EmailUpdatesResponseSchema.safeParse({ status: "pending" }).success,
    ).toBe(false);
  });
});
