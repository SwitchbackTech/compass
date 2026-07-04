import { type PreloadedState } from "@reduxjs/toolkit";
import { type RootState } from "@web/store";

/**
 * Transitional shape for the render helpers' `state` option. While slices
 * migrate from Redux to Zustand this stays a superset of both: migrated
 * domains are seeded into their Zustand store and stripped before the rest
 * is handed to Redux as preloadedState.
 */
export type TestAppState = PreloadedState<RootState>;

/**
 * Seed migrated Zustand stores from the Redux-shaped test state and return
 * the remainder for Redux's preloadedState. Identity until domains migrate.
 */
export function seedStoresFromState(
  state?: TestAppState,
): TestAppState | undefined {
  if (!state) return state;

  const remaining = { ...state };
  // Per-domain seeding added as slices migrate to Zustand.
  return remaining;
}
