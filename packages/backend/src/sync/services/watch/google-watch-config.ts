import { type Logger } from "@core/logger/winston.logger";
import { CONFIG } from "@backend/common/constants/config.constants";
import { isGoogleConfigured } from "@backend/common/constants/config.util";

export const isUsingGcalWebhookHttps = () =>
  CONFIG.GCAL_WEBHOOK_BASEURL.startsWith("https://");

/**
 * Self-host startup check (packet 09 ops): warns once, at boot, when Google
 * is configured but the webhook base URL is not public HTTPS -- the exact
 * condition `initializeGoogleCalendarSync`/`startGoogleWatches` use to skip
 * registering Google watches entirely (see isUsingGcalWebhookHttps above).
 * Guarded on `isGoogleConfigured` so a password-only self-host (no Google
 * client id/secret at all) never sees a warning about a feature it isn't
 * using. Exported standalone (rather than inlined in app.ts) so it has a
 * unit test - app.ts itself is untested boot-sequence infrastructure.
 */
export const warnIfWebhookNotPublicHttps = (
  log: ReturnType<typeof Logger>,
): void => {
  if (!isGoogleConfigured(CONFIG) || isUsingGcalWebhookHttps()) return;

  log.warn(
    "Google Calendar sync is configured, but GCAL_WEBHOOK_BASEURL is not a " +
      "public HTTPS URL -- Google watch notifications are disabled, so " +
      "Compass will not receive live updates from Google Calendar. See " +
      "docs/self-hosting/google-calendar.md#public-watch-notifications.",
  );
};
