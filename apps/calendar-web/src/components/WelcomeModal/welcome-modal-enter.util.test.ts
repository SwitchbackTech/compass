import { shouldDelegateEnterToWelcomePrimary } from "./welcome-modal-enter.util";
import { describe, expect, it } from "bun:test";

describe("shouldDelegateEnterToWelcomePrimary", () => {
  it("delegates when focus is on non-interactive content", () => {
    const primary = document.createElement("button");
    const heading = document.createElement("h1");
    document.body.append(primary, heading);
    heading.focus();

    expect(shouldDelegateEnterToWelcomePrimary(heading, primary)).toBe(true);
    primary.remove();
    heading.remove();
  });

  it("does not delegate when the primary button is focused", () => {
    const primary = document.createElement("button");
    document.body.append(primary);
    primary.focus();

    expect(shouldDelegateEnterToWelcomePrimary(primary, primary)).toBe(false);
    primary.remove();
  });

  it("does not delegate when another button is focused", () => {
    const primary = document.createElement("button");
    const other = document.createElement("button");
    document.body.append(primary, other);
    other.focus();

    expect(shouldDelegateEnterToWelcomePrimary(other, primary)).toBe(false);
    primary.remove();
    other.remove();
  });

  it("does not delegate when a link is focused", () => {
    const primary = document.createElement("button");
    const link = document.createElement("a");
    link.href = "https://example.com";
    document.body.append(primary, link);
    link.focus();

    expect(shouldDelegateEnterToWelcomePrimary(link, primary)).toBe(false);
    primary.remove();
    link.remove();
  });
});
