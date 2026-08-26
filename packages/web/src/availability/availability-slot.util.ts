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

export function selectDefaultAvailabilitySlots(
  slots: readonly AvailabilitySlot[],
  timeZone: string,
  limit = 4,
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
