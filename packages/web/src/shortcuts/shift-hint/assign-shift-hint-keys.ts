/**
 * Day-prefix event jump labels.
 *
 * Week: SU/M/T/W/R/F/SA + per-day chronological index (W4, SU1, F10).
 * Day view: numeric index only (1, 2, …).
 */

export const DAY_JUMP_PREFIX_BY_WEEKDAY = {
  0: "su",
  1: "m",
  2: "t",
  3: "w",
  4: "r",
  5: "f",
  6: "sa",
} as const;

export type DayJumpWeekday = keyof typeof DAY_JUMP_PREFIX_BY_WEEKDAY;

export type DayJumpTarget = {
  eventId: string;
  /** Stable sort key: earlier start first. */
  startMs: number;
  eventType: "all-day" | "timed";
  /** YYYY-MM-DD column date. */
  dayKey: string;
  /** Local weekday 0=Sunday … 6=Saturday. */
  weekday: number;
};

export type DayJumpAssignment = {
  eventId: string;
  /** Full chip text, lowercase (e.g. "w4", "su1", "10"). */
  hint: string;
  dayKey: string;
  /** Letter prefix without index ("w", "su", or "" in day view). */
  dayPrefix: string;
  /** 1-based index within the day (or the whole day-view set). */
  index: number;
};

export type DayJumpLabelMode = "week" | "day";

/** Wait before committing a digit that could still grow (F1 vs F10). */
export const DIGIT_AMBIGUOUS_COMMIT_MS = 400;

const compareTargets = (a: DayJumpTarget, b: DayJumpTarget) => {
  if (a.dayKey !== b.dayKey) return a.dayKey.localeCompare(b.dayKey);
  if (a.startMs !== b.startMs) return a.startMs - b.startMs;
  if (a.eventType !== b.eventType) {
    return a.eventType === "all-day" ? -1 : 1;
  }
  return a.eventId.localeCompare(b.eventId);
};

/**
 * Assign day-prefix (week) or numeric (day) hints. Same targets → same keys.
 */
export function assignDayJumpKeys(
  targets: DayJumpTarget[],
  mode: DayJumpLabelMode = "week",
): DayJumpAssignment[] {
  if (targets.length === 0) return [];

  if (mode === "day") {
    const sorted = [...targets].sort(compareTargets);
    return sorted.map((target, index) => ({
      eventId: target.eventId,
      hint: String(index + 1),
      dayKey: target.dayKey,
      dayPrefix: "",
      index: index + 1,
    }));
  }

  const byDay = new Map<string, DayJumpTarget[]>();
  for (const target of targets) {
    const list = byDay.get(target.dayKey);
    if (list) list.push(target);
    else byDay.set(target.dayKey, [target]);
  }

  const assignments: DayJumpAssignment[] = [];
  const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [dayKey, dayTargets] of days) {
    const sorted = [...dayTargets].sort(compareTargets);
    const weekday = (sorted[0]?.weekday ?? 0) as DayJumpWeekday;
    const dayPrefix = DAY_JUMP_PREFIX_BY_WEEKDAY[weekday] ?? "";
    sorted.forEach((target, index) => {
      const n = index + 1;
      assignments.push({
        eventId: target.eventId,
        hint: `${dayPrefix}${n}`,
        dayKey,
        dayPrefix,
        index: n,
      });
    });
  }

  return assignments;
}

/** Narrow assignments whose hint starts with `prefix`. */
export function filterHintsByPrefix(
  assignments: DayJumpAssignment[],
  prefix: string,
): DayJumpAssignment[] {
  if (!prefix) return assignments;
  return assignments.filter((assignment) => assignment.hint.startsWith(prefix));
}

export type DayJumpMatchResult =
  | {
      kind: "selectDay";
      dayPrefix: string;
      dayKey: string;
      firstEventId: string;
      buffer: string;
    }
  | {
      kind: "prefix";
      buffer: string;
      dayKeys: string[];
      /** Exact hint match that is still ambiguous with a longer sibling. */
      pendingExactEventId?: string;
    }
  | { kind: "focus"; eventId: string; dayKey: string; buffer: string }
  | null;

const UNIQUE_DAY_LETTERS = new Set(["m", "t", "w", "r", "f"]);

/**
 * Resolve a keystroke against assignments + buffer.
 *
 * Buffer holds the typed prefix so far (`""`, `"s"`, `"su"`, `"w"`, `"w1"`…).
 * Unique day letters select the day and focus the first event without requiring
 * a digit. Digits append and focus when the buffer uniquely identifies a hint
 * (exact match with no longer sibling prefixes).
 */
export function matchDayJumpKeystroke({
  assignments,
  key,
  buffer,
  mode = "week",
}: {
  assignments: DayJumpAssignment[];
  key: string;
  buffer: string;
  mode?: DayJumpLabelMode;
}): DayJumpMatchResult {
  if (key.length !== 1) return null;
  const lower = key.toLowerCase();

  if (mode === "day") {
    if (!/^\d$/.test(lower)) return null;
    return matchDigitBuffer(assignments, `${buffer}${lower}`);
  }

  // Digit after a day is selected (buffer is day prefix or day+digits).
  if (/^\d$/.test(lower)) {
    if (!buffer) return null;
    // Still resolving weekend: "s" alone is not a selected day.
    if (buffer === "s") return null;
    return matchDigitBuffer(assignments, `${buffer}${lower}`);
  }

  if (!/^[a-z]$/.test(lower)) return null;

  // Starting a new day selection (or continuing weekend).
  if (!buffer || buffer === "s") {
    if (buffer === "" && lower === "s") {
      const weekend = filterHintsByPrefix(assignments, "s");
      if (weekend.length === 0) return null;
      const dayKeys = uniqueDayKeys(weekend);
      return { kind: "prefix", buffer: "s", dayKeys };
    }

    if (buffer === "s" && (lower === "u" || lower === "a")) {
      const dayPrefix = lower === "u" ? "su" : "sa";
      return selectDayPrefix(assignments, dayPrefix);
    }

    // Abandon an unresolved weekend "s" when another day letter is typed.
    if (UNIQUE_DAY_LETTERS.has(lower)) {
      return selectDayPrefix(assignments, lower);
    }

    return null;
  }

  // Day already selected (or digits in progress): letter starts a new day pick.
  if (lower === "s") {
    const weekend = filterHintsByPrefix(assignments, "s");
    if (weekend.length === 0) return null;
    return { kind: "prefix", buffer: "s", dayKeys: uniqueDayKeys(weekend) };
  }
  if (UNIQUE_DAY_LETTERS.has(lower)) {
    return selectDayPrefix(assignments, lower);
  }

  return null;
}

function selectDayPrefix(
  assignments: DayJumpAssignment[],
  dayPrefix: string,
): DayJumpMatchResult {
  const forDay = assignments.filter(
    (assignment) => assignment.dayPrefix === dayPrefix,
  );
  if (forDay.length === 0) return null;
  const first = forDay.reduce((best, item) =>
    item.index < best.index ? item : best,
  );
  return {
    kind: "selectDay",
    dayPrefix,
    dayKey: first.dayKey,
    firstEventId: first.eventId,
    buffer: dayPrefix,
  };
}

function matchDigitBuffer(
  assignments: DayJumpAssignment[],
  next: string,
): DayJumpMatchResult {
  const narrowed = filterHintsByPrefix(assignments, next);
  if (narrowed.length === 0) return null;

  const exact = narrowed.find((assignment) => assignment.hint === next);
  const hasLonger = narrowed.some(
    (assignment) => assignment.hint.length > next.length,
  );

  if (exact && !hasLonger) {
    return {
      kind: "focus",
      eventId: exact.eventId,
      dayKey: exact.dayKey,
      buffer: next,
    };
  }

  return {
    kind: "prefix",
    buffer: next,
    dayKeys: uniqueDayKeys(narrowed),
    ...(exact ? { pendingExactEventId: exact.eventId } : {}),
  };
}

function uniqueDayKeys(assignments: DayJumpAssignment[]): string[] {
  return [...new Set(assignments.map((item) => item.dayKey))];
}
