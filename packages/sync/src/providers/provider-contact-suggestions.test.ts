import { type ContactSuggestion } from "@core/types/contact.contracts";
import {
  rankContactSuggestions,
  toContactSuggestion,
} from "@sync/providers/provider-contact-suggestions";
import { describe, expect, it } from "bun:test";

const suggestion = (
  email: string,
  displayName: string | null = null,
): ContactSuggestion => ({ email, displayName });

describe("toContactSuggestion", () => {
  it("trims the address and the name", () => {
    expect(toContactSuggestion("  ada@example.com  ", "  Ada  ")).toEqual(
      suggestion("ada@example.com", "Ada"),
    );
  });

  it("drops the candidate when the address is missing or empty", () => {
    expect(toContactSuggestion(null, "Ada")).toBeNull();
    expect(toContactSuggestion(undefined, "Ada")).toBeNull();
    expect(toContactSuggestion("   ", "Ada")).toBeNull();
  });

  it("drops the candidate when the address is past the contract bound", () => {
    expect(toContactSuggestion(`${"a".repeat(321)}`, null)).toBeNull();
    expect(toContactSuggestion(`${"a".repeat(320)}`, null)).not.toBeNull();
  });

  it("keeps the address but drops an unusable name", () => {
    expect(toContactSuggestion("ada@example.com", "  ")).toEqual(
      suggestion("ada@example.com"),
    );
    expect(toContactSuggestion("ada@example.com", "n".repeat(257))).toEqual(
      suggestion("ada@example.com"),
    );
    expect(toContactSuggestion("ada@example.com", null)).toEqual(
      suggestion("ada@example.com"),
    );
  });
});

describe("rankContactSuggestions", () => {
  it("puts prefix matches ahead of substring matches, then the rest", () => {
    const ranked = rankContactSuggestions(
      [
        suggestion("someone@other.com"),
        suggestion("team@example.com", "Not Ada"),
        suggestion("ada@example.com"),
      ],
      "ada",
    );
    expect(ranked.map((entry) => entry.email)).toEqual([
      "ada@example.com",
      "team@example.com",
      "someone@other.com",
    ]);
  });

  it("matches a name prefix as well as an address prefix", () => {
    const ranked = rankContactSuggestions(
      [suggestion("zz@example.com"), suggestion("gh@example.com", "Ada L")],
      "ada",
    );
    expect(ranked[0]?.email).toBe("gh@example.com");
  });

  it("keeps source order among equally ranked candidates", () => {
    const ranked = rankContactSuggestions(
      [suggestion("saved@example.com"), suggestion("other@example.com")],
      "zzz",
    );
    expect(ranked.map((entry) => entry.email)).toEqual([
      "saved@example.com",
      "other@example.com",
    ]);
  });

  it("de-duplicates by case-insensitive address, keeping the best ranked", () => {
    const ranked = rankContactSuggestions(
      [suggestion("Team@Example.com", "Team"), suggestion("team@example.com")],
      "team",
    );
    expect(ranked).toEqual([suggestion("Team@Example.com", "Team")]);
  });
});
