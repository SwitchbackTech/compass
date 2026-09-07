import { type SyncConfig } from "@sync/config/sync.config";
import { GoogleAuthAdapter } from "@sync/providers/google/google-auth.adapter";
import { GoogleCalendarAdapter } from "@sync/providers/google/google-calendar.adapter";
import { GoogleEventReaderAdapter } from "@sync/providers/google/google-event-reader.adapter";
import { GoogleEventWriter } from "@sync/providers/google/google-event-writer.adapter";
import { GoogleNotificationAdapter } from "@sync/providers/google/google-notifications.adapter";
import { GooglePeopleAdapter } from "@sync/providers/google/google-people.adapter";
import {
  type ProviderAdapters,
  ProviderNotConfiguredError,
} from "@sync/providers/provider-adapters";

export function googleProviderConfigured(config: SyncConfig): boolean {
  return Boolean(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET);
}

export function googleAdapters(
  config: SyncConfig,
  override?: Partial<ProviderAdapters>,
): ProviderAdapters {
  // Tests inject partial overrides (auth/writer only) without real OAuth config.
  if (!googleProviderConfigured(config) && override?.auth === undefined) {
    throw new ProviderNotConfiguredError("google");
  }
  return {
    auth:
      override?.auth ??
      new GoogleAuthAdapter(
        config.GOOGLE_CLIENT_ID!,
        config.GOOGLE_CLIENT_SECRET!,
      ),
    calendars: override?.calendars ?? new GoogleCalendarAdapter(),
    reader: override?.reader ?? new GoogleEventReaderAdapter(),
    writer: override?.writer ?? new GoogleEventWriter(),
    notifications: override?.notifications ?? new GoogleNotificationAdapter(),
    contacts: override?.contacts ?? new GooglePeopleAdapter(),
  };
}
