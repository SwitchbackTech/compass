// All app state has migrated to Zustand stores (see src/*/stores and
// src/auth/state). This placeholder keeps the Redux store constructible until
// the store itself is removed.
export const reducers = {
  _migratedToZustand: (state: null = null) => state,
};
