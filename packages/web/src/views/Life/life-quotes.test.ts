import { getRandomLifeQuote, LIFE_QUOTES } from "./life-quotes";
import { describe, expect, it } from "bun:test";

describe("life quotes", () => {
  it("chooses from the supplied quotes", () => {
    expect(getRandomLifeQuote(undefined, () => 0)).toBe(LIFE_QUOTES[0]);
  });

  it("chooses a different quote when shuffled", () => {
    expect(getRandomLifeQuote(LIFE_QUOTES[0], () => 0)).toBe(LIFE_QUOTES[1]);
    expect(getRandomLifeQuote(LIFE_QUOTES[0], () => 1)).not.toBe(
      LIFE_QUOTES[0],
    );
  });
});
