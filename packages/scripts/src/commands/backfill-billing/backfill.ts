import { type Collection, type ObjectId } from "mongodb";
import { BILLING_PLAN } from "@core/constants/billing.constants";
import { type Schema_User } from "@core/types/user.types";

export type BackfillBillingReport = {
  dryRun: boolean;
  cutoff: string;
  matched: number;
  modified: number;
};

export async function backfillBilling(
  users: Collection<Schema_User>,
  options: {
    dryRun: boolean;
    cutoff: Date;
    batchSize: number;
    now?: Date;
    sleep?: (ms: number) => Promise<void>;
  },
): Promise<BackfillBillingReport> {
  const now = options.now ?? new Date();
  const trialEndsAt = new Date(now);
  trialEndsAt.setDate(trialEndsAt.getDate() + BILLING_PLAN.TRIAL_LENGTH_DAYS);

  const filter = {
    "billing.subscriptionStatus": { $exists: false },
    $or: [
      { signedUpAt: { $lte: options.cutoff } },
      { signedUpAt: { $exists: false } },
    ],
  };

  const matched = await users.countDocuments(filter);
  if (options.dryRun || matched === 0) {
    return {
      dryRun: options.dryRun,
      cutoff: options.cutoff.toISOString(),
      matched,
      modified: 0,
    };
  }

  let modified = 0;
  let lastId: ObjectId | undefined;

  for (;;) {
    const batchFilter = lastId ? { ...filter, _id: { $gt: lastId } } : filter;
    const batch = await users
      .find(batchFilter)
      .sort({ _id: 1 })
      .limit(options.batchSize)
      .project({ _id: 1 })
      .toArray();

    if (batch.length === 0) break;

    const ids = batch.map((row) => row["_id"]);
    const result = await users.updateMany(
      { _id: { $in: ids }, "billing.subscriptionStatus": { $exists: false } },
      {
        $set: {
          "billing.subscriptionStatus": "trialing",
          "billing.trialStartedAt": now,
          "billing.trialEndsAt": trialEndsAt,
          "billing.backfilledAt": now,
        },
      },
    );
    modified += result.modifiedCount;
    lastId = ids[ids.length - 1];
    if (options.sleep) await options.sleep(50);
  }

  return {
    dryRun: false,
    cutoff: options.cutoff.toISOString(),
    matched,
    modified,
  };
}
