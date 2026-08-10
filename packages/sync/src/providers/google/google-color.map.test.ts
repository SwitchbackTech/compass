import {
  GOOGLE_COLOR_ID_TO_SLOT,
  googleColorIdFields,
  googleColorIdToSlot,
  SLOT_TO_GOOGLE_COLOR_ID,
  slotToGoogleColorId,
} from "@sync/providers/google/google-color.map";
import { describe, expect, it } from "bun:test";

describe("google-color.map", () => {
  it("round-trips all 11 Google color ids both directions", () => {
    for (const [id, slot] of Object.entries(GOOGLE_COLOR_ID_TO_SLOT)) {
      expect(googleColorIdToSlot(id)).toBe(slot);
      expect(slotToGoogleColorId(slot)).toBe(id);
      expect(SLOT_TO_GOOGLE_COLOR_ID[slot]).toBe(id);
    }
    expect(Object.keys(GOOGLE_COLOR_ID_TO_SLOT)).toHaveLength(11);
  });

  it("returns undefined for unknown, empty, or missing color ids", () => {
    expect(googleColorIdToSlot("42")).toBeUndefined();
    expect(googleColorIdToSlot("")).toBeUndefined();
    expect(googleColorIdToSlot(undefined)).toBeUndefined();
    expect(googleColorIdToSlot(null)).toBeUndefined();
  });

  it("builds Google colorId body fields for set, clear, and omit", () => {
    expect(googleColorIdFields("blue")).toEqual({ colorId: "7" });
    expect(googleColorIdFields(null)).toEqual({ colorId: null });
    expect(googleColorIdFields(undefined)).toEqual({});
  });
});
