import {
  type AvailabilitySlot,
  normalizeAvailabilitySlots,
} from "@web/availability/availability-slot.util";
import { formatTimeZoneAbbreviation } from "@web/timezone/format-timezone-abbreviation";

export const EMPTY_AVAILABILITY_MESSAGE =
  "Select times on the calendar to build your message.";

type FormatAvailabilityMessageOptions = {
  slots: readonly AvailabilitySlot[];
  sourceTimeZone: string;
  recipientTimeZone?: string;
  now?: Date;
  locale?: string;
  hourCycle?: "h12" | "h23";
};

const parts = (
  date: Date,
  timeZone: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
) => new Intl.DateTimeFormat(locale, { timeZone, ...options }).format(date);
const dateKey = (date: Date, timeZone: string) => {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
};
const zoneLabel = (zone: string) =>
  zone.split("/").at(-1)?.replaceAll("_", " ") ?? zone;

function rangeLabel(
  start: Date,
  end: Date,
  timeZone: string,
  locale: string,
  hourCycle?: "h12" | "h23",
) {
  const format: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    hourCycle,
  };
  return `${parts(start, timeZone, locale, format)}–${parts(end, timeZone, locale, format)}`
    .replaceAll(" ", "")
    .replaceAll("AM", "am")
    .replaceAll("PM", "pm");
}

export function formatAvailabilityMessage({
  slots,
  sourceTimeZone,
  recipientTimeZone,
  now = new Date(),
  locale = "en-US",
  hourCycle,
}: FormatAvailabilityMessageOptions): string {
  const intervals = normalizeAvailabilitySlots(slots);
  if (!intervals.length) return EMPTY_AVAILABILITY_MESSAGE;
  const abbreviations = (zone: string) =>
    new Set(
      intervals.map((slot) =>
        formatTimeZoneAbbreviation(zone, new Date(slot.start)),
      ),
    );
  const sourceAbbreviations = abbreviations(sourceTimeZone);
  const recipientAbbreviations = recipientTimeZone
    ? abbreviations(recipientTimeZone)
    : undefined;
  const headingZone =
    sourceAbbreviations.size === 1 &&
    (!recipientAbbreviations || recipientAbbreviations.size === 1)
      ? [sourceAbbreviations, recipientAbbreviations]
          .filter(Boolean)
          .map((values) => [...values!][0])
          .join("/")
      : [
          zoneLabel(sourceTimeZone),
          recipientTimeZone && zoneLabel(recipientTimeZone),
        ]
          .filter(Boolean)
          .join("/");
  const sourceYears = new Set(
    intervals.map((slot) =>
      parts(new Date(slot.start), sourceTimeZone, "en-US", { year: "numeric" }),
    ),
  );
  const currentYear = parts(now, sourceTimeZone, "en-US", { year: "numeric" });
  const includeYear = sourceYears.size > 1 || !sourceYears.has(currentYear);
  const groups = new Map<string, AvailabilitySlot[]>();
  for (const interval of intervals) {
    const key = dateKey(new Date(interval.start), sourceTimeZone);
    groups.set(key, [...(groups.get(key) ?? []), interval]);
  }
  const lines = [`Do any of these times (${headingZone}) work for you?`, ""];
  for (const group of groups.values()) {
    const first = new Date(group[0].start);
    const date = parts(first, sourceTimeZone, locale, {
      month: "long",
      day: "numeric",
      ...(includeYear && { year: "numeric" }),
    });
    const weekday = parts(first, sourceTimeZone, locale, { weekday: "long" });
    lines.push(`${date} (${weekday}):`);
    for (const interval of group) {
      const start = new Date(interval.start);
      const end = new Date(interval.end);
      const source = `${rangeLabel(start, end, sourceTimeZone, locale, hourCycle)} (${formatTimeZoneAbbreviation(sourceTimeZone, start)})`;
      let bullet = `- ${source}`;
      if (recipientTimeZone) {
        const recipientDatePrefix =
          dateKey(start, recipientTimeZone) === dateKey(start, sourceTimeZone)
            ? ""
            : `${parts(start, recipientTimeZone, locale, { month: "short", day: "numeric" })}, `;
        bullet += ` / ${recipientDatePrefix}${rangeLabel(start, end, recipientTimeZone, locale, hourCycle)} (${formatTimeZoneAbbreviation(recipientTimeZone, start)})`;
      }
      lines.push(bullet);
    }
  }
  return lines.join("\n");
}
