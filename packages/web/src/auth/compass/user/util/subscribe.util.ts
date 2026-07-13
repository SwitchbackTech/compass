import { type UserMetadata } from "@core/types/user.types";
import { UserApi } from "@web/api/user.api";
import { userMetadataActions } from "@web/auth/state/user-metadata.store";

/**
 * Opt the current user into monthly release-note emails.
 *
 * One-way: unsubscribing happens via the email's own footer link, not from
 * within Compass. On success the local metadata store is updated so UI that
 * gates on `subscribeToUpdates` (e.g. the command palette item) reacts
 * immediately. Callers own their own success/error feedback.
 */
export async function subscribeToReleaseNotes(): Promise<UserMetadata> {
  const metadata = await UserApi.updateMetadata({ subscribeToUpdates: true });
  userMetadataActions.set(metadata);
  return metadata;
}
