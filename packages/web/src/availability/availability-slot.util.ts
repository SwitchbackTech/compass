import dayjs from "@core/util/date/dayjs";

export type AvailabilitySlot = {
  id: string;
  start: string;
  end: string;
  selected: boolean;
  origin: "suggested" | "user";
};

export type AvailabilityConflict =
  | { start: string; end: string; allDay?: false; busy?: boolean }
  | { date: string; allDay: true; busy?: boolean };

export type GenerateAvailabilitySlotsOptions = {
  rangeStart: string | Date;
  rangeEnd: string | Date;
  now: string | Date;
  timeZone: string;
  conflicts?: readonly AvailabilityConflict[];
};

const SLOT_MINUTES = 30;

export function intervalsOverlap(
  first: Pick<AvailabilitySlot, "start" | "end">,
  second: { start: string; end: string },
): boolean {
  return (
    Date.parse(first.start) < Date.parse(second.end) &&
    Date.parse(second.start) < Date.parse(first.end)
  );
}

export function generateAvailabilitySlots({
  rangeStart,
  rangeEnd,
  now,
  timeZone,
  conflicts = [],
}: GenerateAvailabilitySlotsOptions): AvailabilitySlot[] {
  const lowerBound = Math.max(
    new Date(rangeStart).getTime(),
    new Date(now).getTime(),
  );
  const upperBound = new Date(rangeEnd).getTime();
  if (lowerBound >= upperBound) return [];

  const blockedDates = new Set(
    conflicts
      .filter(
        (
          conflict,
        ): conflict is Extract<AvailabilityConflict, { allDay: true }> =>
          conflict.busy !== false && conflict.allDay === true,
      )
      .map((conflict) => conflict.date),
  );
  const timedConflicts = conflicts.filter(
    (conflict): conflict is Extract<AvailabilityConflict, { allDay?: false }> =>
      conflict.busy !== false && !conflict.allDay,
  );
  const firstDate = dayjs(rangeStart).tz(timeZone).startOf("day");
  const lastDate = dayjs(rangeEnd).tz(timeZone).startOf("day");
  const slots: AvailabilitySlot[] = [];

  for (
    let date = firstDate;
    !date.isAfter(lastDate, "day");
    date = date.add(1, "day")
  ) {
    const weekday = date.day();
    const localDate = date.format("YYYY-MM-DD");
    if (weekday === 0 || weekday === 6 || blockedDates.has(localDate)) continue;

    for (let hour = 9; hour < 17; hour += 1) {
      for (const minute of [0, 30]) {
        const start = dayjs.tz(
          `${localDate} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
          "YYYY-MM-DD HH:mm",
          timeZone,
        );
        const end = start.add(SLOT_MINUTES, "minute");
        const startMs = start.valueOf();
        const endMs = end.valueOf();
        if (startMs < lowerBound || endMs > upperBound) continue;
        const slot = { start: start.toISOString(), end: end.toISOString() };
        if (timedConflicts.some((conflict) => intervalsOverlap(slot, conflict)))
          continue;
        slots.push({
          id: `${slot.start}/${slot.end}`,
          ...slot,
          selected: false,
          origin: "suggested",
        });
      }
    }
  }
  return slots;
}

function localParts(slot: AvailabilitySlot, timeZone: string) {
  const local = dayjs(slot.start).tz(timeZone);
  return {
    date: local.format("YYYY-MM-DD"),
    minutes: local.hour() * 60 + local.minute(),
  };
}

/**
 * How many times we offer by default. Three is enough for the recipient to
 * have a real choice while keeping the accept-each-one flow to three Enters.
 */
export const DEFAULT_AVAILABILITY_SLOT_COUNT = 3;

export function selectDefaultAvailabilitySlots(
  slots: readonly AvailabilitySlot[],
  timeZone: string,
  limit = DEFAULT_AVAILABILITY_SLOT_COUNT,
): AvailabilitySlot[] {
  const sorted = [...slots].sort((a, b) => {
    const left = localParts(a, timeZone);
    const right = localParts(b, timeZone);
    return (
      left.date.localeCompare(right.date) ||
      Math.abs(left.minutes - 600) - Math.abs(right.minutes - 600) ||
      Math.abs(left.minutes - 840) - Math.abs(right.minutes - 840) ||
      left.minutes - right.minutes ||
      a.start.localeCompare(b.start)
    );
  });
  const selected = new Set<string>();
  const days = new Set<string>();
  for (const slot of sorted) {
    const day = localParts(slot, timeZone).date;
    if (!days.has(day)) {
      selected.add(slot.id);
      days.add(day);
      if (selected.size === limit) break;
    }
  }

  if (selected.size < limit) {
    const fill = (requireSpacing: boolean) => {
      for (const slot of sorted) {
        if (selected.has(slot.id)) continue;
        const candidate = localParts(slot, timeZone);
        const sameDayStarts = sorted
          .filter(
            (other) =>
              selected.has(other.id) &&
              localParts(other, timeZone).date === candidate.date,
          )
          .map((other) => localParts(other, timeZone).minutes);
        if (
          requireSpacing &&
          sameDayStarts.some(
            (minutes) => Math.abs(minutes - candidate.minutes) < 60,
          )
        )
          continue;
        selected.add(slot.id);
        if (selected.size === limit) return;
      }
    };
    fill(true);
    if (selected.size < limit) fill(false);
  }
  return slots.map((slot) => ({ ...slot, selected: selected.has(slot.id) }));
}

/**
 * Repositioning walks the candidate list rather than adding or subtracting
 * minutes, so busy time is skipped for free: `generateAvailabilitySlots` has
 * already removed anything that overlaps a real event, and candidates another
 * pick already occupies are stepped over so two offers can never collide.
 */
export interface StepAvailabilityCandidateOptions {
  slots: readonly AvailabilitySlot[];
  fromId: string;
  /** Candidate ids held by the other picks. */
  taken?: readonly string[];
  timeZone: string;
  now?: number;
}

const isReachable = (
  slot: AvailabilitySlot,
  taken: ReadonlySet<string>,
  now: number,
) => !taken.has(slot.id) && Date.parse(slot.start) >= now;

/**
 * Next/previous free block in chronological order. Rolling off the end of a
 * day lands on the next day's first block, which is what the flat list
 * already encodes - no wrap at the ends, so repositioning cannot silently
 * jump the offer across the whole range.
 */
export function stepAvailabilityCandidateByTime(
  delta: -1 | 1,
  {
    slots,
    fromId,
    taken = [],
    now = Date.now(),
  }: StepAvailabilityCandidateOptions,
): AvailabilitySlot | null {
  const takenSet = new Set(taken);
  const index = slots.findIndex(({ id }) => id === fromId);
  if (index < 0) return null;
  for (
    let next = index + delta;
    next >= 0 && next < slots.length;
    next += delta
  )
    if (isReachable(slots[next]!, takenSet, now)) return slots[next]!;
  return null;
}

/**
 * Same local time on the previous/next day that has any free block, falling
 * back to that day's closest block when the exact time is busy.
 */
export function stepAvailabilityCandidateByDay(
  delta: -1 | 1,
  {
    slots,
    fromId,
    taken = [],
    timeZone,
    now = Date.now(),
  }: StepAvailabilityCandidateOptions,
): AvailabilitySlot | null {
  const takenSet = new Set(taken);
  const from = slots.find(({ id }) => id === fromId);
  if (!from) return null;
  const anchor = localParts(from, timeZone);
  const reachable = slots.filter((slot) => isReachable(slot, takenSet, now));
  const days = [
    ...new Set(reachable.map((slot) => localParts(slot, timeZone).date)),
  ].sort();
  const targetDay = days[days.indexOf(anchor.date) + delta];
  if (!targetDay) return null;
  return (
    reachable
      .filter((slot) => localParts(slot, timeZone).date === targetDay)
      .sort(
        (a, b) =>
          Math.abs(localParts(a, timeZone).minutes - anchor.minutes) -
          Math.abs(localParts(b, timeZone).minutes - anchor.minutes),
      )[0] ?? null
  );
}

export function normalizeAvailabilitySlots(
  slots: readonly AvailabilitySlot[],
): AvailabilitySlot[] {
  const selected = slots
    .filter((slot) => slot.selected)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const normalized: AvailabilitySlot[] = [];
  for (const slot of selected) {
    const previous = normalized.at(-1);
    if (previous && previous.end === slot.start) {
      previous.end = slot.end;
      previous.id = `${previous.start}/${previous.end}`;
      if (slot.origin === "user") previous.origin = "user";
    } else {
      normalized.push({ ...slot });
    }
  }
  return normalized;
}
