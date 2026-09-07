import { type SyncConfig } from "@sync/config/sync.config";
import { MicrosoftAuthAdapter } from "@sync/providers/microsoft/microsoft-auth.adapter";
import { MicrosoftCalendarAdapter } from "@sync/providers/microsoft/microsoft-calendar.adapter";
import { MicrosoftEventReaderAdapter } from "@sync/providers/microsoft/microsoft-event-reader.adapter";
import { MicrosoftEventWriter } from "@sync/providers/microsoft/microsoft-event-writer.adapter";
import { MicrosoftNotificationAdapter } from "@sync/providers/microsoft/microsoft-notifications.adapter";
import { MicrosoftPeopleAdapter } from "@sync/providers/microsoft/microsoft-people.adapter";
import {
  type ProviderAdapters,
  ProviderNotConfiguredError,
} from "@sync/providers/provider-adapters";

export function microsoftProviderConfigured(config: SyncConfig): boolean {
  return Boolean(config.MICROSOFT_CLIENT_ID && config.MICROSOFT_CLIENT_SECRET);
}

export function microsoftAdapters(
  config: SyncConfig,
  override?: Partial<ProviderAdapters>,
): ProviderAdapters {
  // Tests inject partial overrides (auth/writer only) without real OAuth config.
  if (!microsoftProviderConfigured(config) && override?.auth === undefined) {
    throw new ProviderNotConfiguredError("microsoft");
  }
  return {
    auth:
      override?.auth ??
      new MicrosoftAuthAdapter(
        config.MICROSOFT_CLIENT_ID!,
        config.MICROSOFT_CLIENT_SECRET!,
      ),
    calendars: override?.calendars ?? new MicrosoftCalendarAdapter(),
    reader: override?.reader ?? new MicrosoftEventReaderAdapter(),
    writer: override?.writer ?? new MicrosoftEventWriter(),
    notifications:
      override?.notifications ?? new MicrosoftNotificationAdapter(),
    contacts: override?.contacts ?? new MicrosoftPeopleAdapter(),
  };
}
