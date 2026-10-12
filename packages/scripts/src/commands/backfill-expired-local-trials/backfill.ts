import { type Collection, type Filter, ObjectId } from "mongodb";
import {
  isStaleLocalTrialingRow,
  resolveSubscriptionStatus,
} from "@core/billing/resolve-subscription-status";
import { type Schema_User } from "@core/types/user.types";

export type LocalTrialBackfillChange = {
  userId: string;
  email: string;
  trialEndsAt: string | null;
  fromStatus: "trialing";
  toStatus: ReturnType<typeof resolveSubscriptionStatus>;
};

export type BackfillExpiredLocalTrialsReport = {
  dryRun: boolean;
  matched: number;
  modified: number;
  changes: LocalTrialBackfillChange[];
};

const localTrialFilter = (): Filter<Schema_User> => ({
  "billing.subscriptionStatus": "trialing",
  $or: [
    { "billing.stripeSubscriptionId": { $exists: false } },
    { "billing.stripeSubscriptionId": null },
  ],
});

export async function backfillExpiredLocalTrials(
  users: Collection<Schema_User>,
  options: {
    dryRun: boolean;
    batchSize: number;
    now?: Date;
    sleep?: (ms: number) => Promise<void>;
  },
): Promise<BackfillExpiredLocalTrialsReport> {
  const now = options.now ?? new Date();
  const changes: LocalTrialBackfillChange[] = [];
  let lastId: ObjectId | undefined;

  for (;;) {
    const batchFilter: Filter<Schema_User> = lastId
      ? { ...localTrialFilter(), _id: { $gt: lastId } }
      : localTrialFilter();
    const batch = await users
      .find(batchFilter)
      .sort({ _id: 1 })
      .limit(options.batchSize)
      .project({ _id: 1, email: 1, billing: 1 })
      .toArray();

    if (batch.length === 0) break;

    for (const row of batch) {
      const billing = row["billing"];
      if (!billing || !isStaleLocalTrialingRow(billing, now)) continue;

      changes.push({
        userId: row["_id"].toString(),
        email: row["email"],
        trialEndsAt: billing.trialEndsAt?.toISOString() ?? null,
        fromStatus: "trialing",
        toStatus: resolveSubscriptionStatus(billing, now),
      });
    }

    lastId = batch[batch.length - 1]?.["_id"];
    if (options.sleep) await options.sleep(0);
  }

  if (options.dryRun || changes.length === 0) {
    return {
      dryRun: options.dryRun,
      matched: changes.length,
      modified: 0,
      changes,
    };
  }

  let modified = 0;
  for (const change of changes) {
    const result = await users.updateOne(
      { _id: new ObjectId(change.userId), ...localTrialFilter() },
      { $set: { "billing.subscriptionStatus": change.toStatus } },
    );
    modified += result.modifiedCount;
    if (options.sleep) await options.sleep(50);
  }

  return {
    dryRun: false,
    matched: changes.length,
    modified,
    changes,
  };
}
