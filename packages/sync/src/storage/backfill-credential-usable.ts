import { type Db } from "mongodb";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";

// Stamp credentialUsable onto sync_resources written before the field existed,
// from whether a credentials row exists for connectionId. Rows that already
// hold the field are left alone: CredentialRepository mirrors live store and
// delete, and a missing field is the only gap this has to close.
export async function backfillCredentialUsable(db: Db): Promise<number> {
  const resources = db.collection(SYNC_COLLECTIONS.syncResources);
  const missing = await resources.countDocuments({
    credentialUsable: { $exists: false },
  });
  if (missing === 0) return 0;

  await resources
    .aggregate([
      {
        $match: {
          credentialUsable: { $exists: false },
        },
      },
      {
        $lookup: {
          from: SYNC_COLLECTIONS.credentials,
          localField: "connectionId",
          foreignField: "_id",
          as: "_credential",
        },
      },
      {
        $project: {
          credentialUsable: {
            $gt: [{ $size: "$_credential" }, 0],
          },
        },
      },
      {
        $merge: {
          into: SYNC_COLLECTIONS.syncResources,
          on: "_id",
          whenMatched: "merge",
          whenNotMatched: "discard",
        },
      },
    ])
    .toArray();

  return missing;
}
