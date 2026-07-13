import { UserApi } from "@web/api/user.api";
import { userMetadataActions } from "@web/auth/state/user-metadata.store";

export async function subscribeToReleaseNotes(): Promise<void> {
  const metadata = await UserApi.updateMetadata({ subscribeToUpdates: true });
  userMetadataActions.set(metadata);
}
