import pkg from "inquirer";
import uniqBy from "lodash.uniqby";
import { log } from "@scripts/common/cli.utils";
import { WithCompassId } from "@core/types/event.types";
import { Schema_Sync } from "@core/types/sync.types";
import mongoService from "@backend/common/services/mongo.service";

const { prompt } = pkg;

type AggregateParams = Parameters<typeof mongoService.sync.aggregate>;
type Pipeline = AggregateParams[0];
type AggregateOptions = Exclude<AggregateParams[1], undefined>;
type ClientSession = AggregateOptions["session"];

function mergeDuplicateSyncRecords({
  _id: user,
  items: duplicates,
}: WithCompassId<{ items: Schema_Sync[] }>) {
  return duplicates.reduce(
    (aggregate, duplicate): Schema_Sync => ({
      ...aggregate,
      google: {
        calendarlist: uniqBy(
          [
            ...duplicate.google.calendarlist,
            ...(aggregate.google?.calendarlist ?? []),
          ],
          "gCalendarId",
        ),
        events: uniqBy(
          [...duplicate.google.events, ...(aggregate.google?.events ?? [])],
          ({ channelId, gCalendarId, resourceId }) =>
            `${channelId}_${gCalendarId}_${resourceId}`,
        ),
      },
      user,
    }),
    {} as Schema_Sync,
  );
}

async function getMatchingUsers(): Promise<
  Array<WithCompassId<{ items: Schema_Sync[] }>>
> {
  log.info("Fetching Duplicate Compass sync user data");

  const pipeline: Pipeline = [
    { $group: { _id: "$user", items: { $push: "$$ROOT" } } },
    { $match: { $expr: { $gt: [{ $size: "$items" }, 1] } } },
  ];

  return mongoService.sync
    .aggregate<WithCompassId<{ items: Schema_Sync[] }>>(pipeline)
    .toArray();
}

async function deleteMatchingUsersSyncRecords(
  records: Array<WithCompassId<{ items: Schema_Sync[] }>>,
  session?: ClientSession,
): Promise<{ deletedCount: number }> {
  log.info("Deleting Compass sync data for matching users");

  const { deletedCount } = await mongoService.sync.deleteMany(
    { user: { $in: records.map(({ _id }) => _id) } },
    { session },
  );

  log.info(`${deletedCount} sync data deleted for ${records.length} users`);

  return { deletedCount };
}

async function saveMergedUsersSyncRecords(
  records: Array<WithCompassId<{ items: Schema_Sync[] }>>,
  session?: ClientSession,
): Promise<{ insertedCount: number }> {
  const newRecords: Schema_Sync[] = records.map(mergeDuplicateSyncRecords);

  const { insertedCount } = await mongoService.sync.insertMany(newRecords, {
    session,
  });

  log.info(`${insertedCount} sync data created for ${records.length} users`);

  return { insertedCount };
}

export const mergeCompassSyncDataForMatchingUsers = async (
  records: Array<WithCompassId<{ items: Schema_Sync[] }>>,
) => {
  const session = await mongoService.startSession();

  try {
    log.info("Merging Compass sync data for matching users");

    session.startTransaction();

    const { deletedCount } = await deleteMatchingUsersSyncRecords(
      records,
      session,
    );

    const { insertedCount } = await saveMergedUsersSyncRecords(
      records,
      session,
    );

    await session.commitTransaction();

    log.success(
      `Merge results: ${JSON.stringify({ deletedCount, insertedCount }, null, 2)}`,
    );
  } catch (error: unknown) {
    await session.abortTransaction();

    log.error(
      `Rolling back all merge sync operations due to error:\n${(error as Error).stack}`,
    );
  } finally {
    process.exit(0);
  }
};

export const startSyncDuplicateMergeFlow = async (force = false) => {
  await mongoService.start();

  const records = await getMatchingUsers();
  const noOfUsers = records.length;

  log.info(`Found duplicate Compass sync data for ${noOfUsers} user(s)`);

  if (noOfUsers === 0) process.exit(0);

  if (force === true) return mergeCompassSyncDataForMatchingUsers(records);

  const questions = [
    {
      type: "confirm",
      name: "mergeSync",
      message: `This will merge the Compass sync data for all matching ${noOfUsers} user(s).\nContinue?`,
    },
  ];

  return prompt(questions)
    .then(async (a: { mergeSync: boolean }) => {
      if (a.mergeSync) {
        log.info(`Okie dokie, merging ${noOfUsers} users Compass sync data...`);

        return mergeCompassSyncDataForMatchingUsers(records);
      } else {
        log.info("No worries, see ya next time");
        process.exit(0);
      }
    })
    .catch((err) => log.error(err.message));
};
