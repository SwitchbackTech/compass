import { type Collection, type ObjectId } from "mongodb";
import { mergeGoogleLoginIdentity } from "@core/mappers/map.user";
import { type Schema_User } from "@core/types/user.types";

export type BackfillIdentitiesReport = {
  dryRun: boolean;
  matched: number;
  modified: number;
};

const NEEDS_GOOGLE_IDENTITY = {
  "google.googleId": { $exists: true, $nin: [null, ""] },
  identities: {
    $not: { $elemMatch: { provider: "google" as const } },
  },
};

export async function backfillIdentities(
  users: Collection<Schema_User>,
  options: {
    dryRun: boolean;
    batchSize: number;
    now?: Date;
    sleep?: (ms: number) => Promise<void>;
  },
): Promise<BackfillIdentitiesReport> {
  const now = options.now ?? new Date();
  const matched = await users.countDocuments(NEEDS_GOOGLE_IDENTITY);
  if (options.dryRun || matched === 0) {
    return { dryRun: options.dryRun, matched, modified: 0 };
  }

  let modified = 0;
  let lastId: ObjectId | undefined;

  for (;;) {
    const batchFilter = lastId
      ? { ...NEEDS_GOOGLE_IDENTITY, _id: { $gt: lastId } }
      : NEEDS_GOOGLE_IDENTITY;
    const batch = await users
      .find(batchFilter)
      .sort({ _id: 1 })
      .limit(options.batchSize)
      .toArray();

    if (batch.length === 0) break;

    for (const user of batch) {
      if (!user.google?.googleId) continue;
      const identities = mergeGoogleLoginIdentity(
        user.identities,
        user.google,
        user.email,
        user.name,
        user.signedUpAt ?? now,
      );
      if (!identities) continue;

      const result = await users.updateOne(
        {
          _id: user._id,
          "google.googleId": user.google.googleId,
          identities: {
            $not: { $elemMatch: { provider: "google" } },
          },
        },
        { $set: { identities } },
      );
      modified += result.modifiedCount;
    }

    lastId = batch[batch.length - 1]?._id;
    if (options.sleep) await options.sleep(50);
  }

  return { dryRun: false, matched, modified };
}
