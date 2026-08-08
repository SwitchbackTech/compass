/**
 * Home-row-first hint alphabet. `j`/`k` are excluded so Shift+J/K week-window
 * navigation stays unambiguous while hints are armed or pending.
 */
export const SHIFT_HINT_ALPHABET = ["a", "s", "d", "f", "g", "h", "l"] as const;

export type ShiftHintTarget = {
  eventId: string;
  /** Stable sort key: earlier start first. */
  startMs: number;
  eventType: "all-day" | "timed";
};

export type ShiftHintAssignment = {
  eventId: string;
  hint: string;
};

/**
 * Deterministic hint keys for the visible target set. Same targets → same keys
 * across re-renders within a hold. Singles first, then two-letter combos from
 * the same alphabet when more events are visible than single keys.
 */
export function assignShiftHintKeys(
  targets: ShiftHintTarget[],
): ShiftHintAssignment[] {
  if (targets.length === 0) return [];

  const sorted = [...targets].sort((a, b) => {
    if (a.startMs !== b.startMs) return a.startMs - b.startMs;
    if (a.eventType !== b.eventType) {
      return a.eventType === "all-day" ? -1 : 1;
    }
    return a.eventId.localeCompare(b.eventId);
  });

  const keys = generateHintKeys(sorted.length);
  return sorted.flatMap((target, index) => {
    const hint = keys[index];
    if (!hint) return [];
    return [{ eventId: target.eventId, hint }];
  });
}

export function generateHintKeys(count: number): string[] {
  if (count <= 0) return [];

  // Stay on singles while they cover the set. Past that, use only two-letter
  // combos so the first keystroke always narrows instead of colliding with a
  // single-letter assignment that shares the same prefix.
  if (count <= SHIFT_HINT_ALPHABET.length) {
    return SHIFT_HINT_ALPHABET.slice(0, count).map((key) => key);
  }

  const keys: string[] = [];
  for (const first of SHIFT_HINT_ALPHABET) {
    for (const second of SHIFT_HINT_ALPHABET) {
      keys.push(`${first}${second}`);
      if (keys.length >= count) return keys;
    }
  }

  return keys.slice(0, count);
}

/** Narrow assignments whose hint starts with `prefix` (two-letter flow). */
export function filterHintsByPrefix(
  assignments: ShiftHintAssignment[],
  prefix: string,
): ShiftHintAssignment[] {
  if (!prefix) return assignments;
  return assignments.filter((assignment) => assignment.hint.startsWith(prefix));
}

/**
 * Resolve a keystroke against current assignments + optional prefix buffer.
 * Returns the focused event id, an updated prefix, or null when ignored.
 */
export function matchShiftHintKeystroke({
  assignments,
  key,
  prefix,
}: {
  assignments: ShiftHintAssignment[];
  key: string;
  prefix: string;
}):
  | { kind: "focus"; eventId: string }
  | { kind: "prefix"; prefix: string }
  | null {
  if (key.length !== 1) return null;
  const lower = key.toLowerCase();
  if (
    !SHIFT_HINT_ALPHABET.includes(lower as (typeof SHIFT_HINT_ALPHABET)[number])
  ) {
    return null;
  }

  const next = `${prefix}${lower}`;
  const exact = assignments.find((assignment) => assignment.hint === next);
  if (exact) {
    return { kind: "focus", eventId: exact.eventId };
  }

  const narrowed = filterHintsByPrefix(assignments, next);
  if (narrowed.length === 0) {
    return null;
  }

  return { kind: "prefix", prefix: next };
}
