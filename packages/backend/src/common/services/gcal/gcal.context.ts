import { type gCalendar } from "@core/types/gcal";
import { getTestGcalOverride } from "@backend/common/services/gcal/gcal.test-context";
import { getGcalClient } from "@backend/sync/services/google-sync/gcal.client";

/**
 * Everything a Google Calendar API call needs: the authenticated client and
 * the stable per-user `quotaUser` used for Google's quota accounting. Every
 * call for a given user must reuse the same `quotaUser` (the Compass user
 * id) rather than generating a fresh one per request.
 */
export interface GoogleRequestContext {
  gcal: gCalendar;
  quotaUser: string;
}

/**
 * Builds a GoogleRequestContext for `userId`, fetching a gCalendar client
 * for them. Callers that already hold a `gCalendar` obtained some other way
 * should build the context object directly (`{ gcal, quotaUser: userId }`)
 * instead of calling this, to avoid a redundant network/DB round trip.
 */
export type GcalClientResolver = (userId: string) => Promise<gCalendar>;

export const createGoogleRequestContext = async (
  userId: string,
  resolveGcalClient: GcalClientResolver = getGcalClient,
): Promise<GoogleRequestContext> => {
  const testGcal = getTestGcalOverride();
  const gcal = testGcal ?? (await resolveGcalClient(userId));

  return { gcal, quotaUser: userId };
};
