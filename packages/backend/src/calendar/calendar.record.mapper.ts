import {
  type Calendar,
  getCalendarCapabilities,
} from "@core/types/calendar.contracts";
import { type CalendarId } from "@core/types/domain-primitives";
import { type CalendarRecord } from "@backend/calendar/calendar.record";

export const mapCalendarRecord = (record: CalendarRecord): Calendar => ({
  id: record._id.toHexString() as CalendarId,
  name: record.name,
  description: record.description,
  timeZone: record.timeZone,
  foregroundColor: record.foregroundColor,
  backgroundColor: record.backgroundColor,
  provider: record.source.provider,
  access: record.access,
  capabilities: getCalendarCapabilities(record.access),
  isPrimary: record.isPrimary,
  isVisible: record.isVisible,
  isActive: record.isActive,
});
