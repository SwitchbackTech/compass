import { TimezoneSchema } from "@core/types/type.utils";
import { microsoftGraphRequest } from "@sync/providers/microsoft/microsoft-graph-request";
import { MICROSOFT_GRAPH_BASE_URL } from "@sync/providers/microsoft/microsoft-http.constants";
import { windowsZoneToIana } from "@sync/providers/microsoft/windows-zones";

interface GraphMailboxSettings {
  readonly timeZone?: string;
}

/** Best-effort mailbox default zone for recurring-event wall-clock fallback. */
export async function fetchMicrosoftMailboxIanaTimeZone(
  accessToken: string,
): Promise<string | null> {
  try {
    const data = await microsoftGraphRequest<GraphMailboxSettings>({
      accessToken,
      url: `${MICROSOFT_GRAPH_BASE_URL}/me/mailboxSettings`,
      fallbackError: "microsoft_mailbox_settings_failed",
    });
    if (!data.timeZone?.trim()) return null;
    return toIanaTimeZone(data.timeZone.trim());
  } catch {
    return null;
  }
}

function toIanaTimeZone(timeZone: string): string | null {
  if (TimezoneSchema.safeParse(timeZone).success) return timeZone;
  try {
    return windowsZoneToIana(timeZone);
  } catch {
    return null;
  }
}
