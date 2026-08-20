import { scoreCommandItem } from "@web/components/CommandPalette/command-palette.search";
import { formatTimeZoneAbbreviation } from "@web/timezone/format-timezone-abbreviation";

export interface TimeZoneListItem {
  id: string;
  city: string;
  region: string;
  abbreviation: string;
  offset: string;
  offsetMinutes: number;
  secondary: string;
  keywords: string[];
}

export function timeZoneCityName(id: string): string {
  const last = id.split("/").pop() ?? id;
  return last.replaceAll("_", " ");
}

function regionFromIanaId(id: string): string {
  const slash = id.indexOf("/");
  return slash === -1 ? id : id.slice(0, slash);
}

function offsetMinutesAt(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    hour: "numeric",
  }).formatToParts(at);
  const raw = parts.find((part) => part.type === "timeZoneName")?.value ?? "";
  const match = raw.match(/([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) {
    return 0;
  }
  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");
  return sign * (hours * 60 + minutes);
}

function formatOffsetLabel(timeZone: string, at: Date): string {
  return (
    new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" })
      .formatToParts(at)
      .find((part) => part.type === "timeZoneName")?.value ?? ""
  );
}

let cachedZones: string[] | null = null;

function supportedTimeZones(): string[] {
  cachedZones ??= Intl.supportedValuesOf("timeZone");
  return cachedZones;
}

export function buildTimeZoneList(at: Date = new Date()): TimeZoneListItem[] {
  return supportedTimeZones().map((id) => {
    const city = timeZoneCityName(id);
    const region = regionFromIanaId(id);
    const abbreviation = formatTimeZoneAbbreviation(id, at);
    const offset = formatOffsetLabel(id, at);
    return {
      id,
      city,
      region,
      abbreviation,
      offset,
      offsetMinutes: offsetMinutesAt(id, at),
      secondary: [abbreviation, offset].filter(Boolean).join(", "),
      keywords: [id, region, abbreviation, offset],
    };
  });
}

export function sortTimeZonesByOffsetDistance(
  zones: TimeZoneListItem[],
  currentTimeZone: string,
): TimeZoneListItem[] {
  const current = zones.find((zone) => zone.id === currentTimeZone);
  const currentOffset = current?.offsetMinutes ?? 0;

  return [...zones].sort((left, right) => {
    if (left.id === currentTimeZone) return -1;
    if (right.id === currentTimeZone) return 1;

    const leftDistance = Math.abs(left.offsetMinutes - currentOffset);
    const rightDistance = Math.abs(right.offsetMinutes - currentOffset);
    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }
    return left.city.localeCompare(right.city);
  });
}

export function filterTimeZones(
  zones: TimeZoneListItem[],
  query: string,
): TimeZoneListItem[] {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return zones;
  }

  return zones
    .map((zone) => ({
      zone,
      score: scoreCommandItem(
        { label: zone.city, keywords: zone.keywords },
        trimmed,
      ),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.zone);
}
