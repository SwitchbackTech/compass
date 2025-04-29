import { ObjectId } from "mongodb";
import { Schema_Event_Recur_Base } from "@core/types/event.types";
import { Collections } from "@backend/common/constants/collections";
import { EventError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import mongoService from "@backend/common/services/mongo.service";
import { Ids_Event } from "../../../queries/event.queries";
import { stripBaseProps } from "../util/recur.util";

export const getOldBaseId = async (
  updatedBase: Schema_Event_Recur_Base,
  idKey: Ids_Event,
  userId: string,
) => {
  const oldBase = await mongoService.db
    .collection(Collections.EVENT)
    .findOne({ [idKey]: updatedBase[idKey], user: userId });
  if (!oldBase) {
    throw error(
      EventError.MissingGevents,
      `Did not update series due to missing key-value (${idKey})`,
    );
  }

  const baseId = oldBase._id;
  return baseId;
};

export const updateAllDayInstances = async (
  baseId: ObjectId,
  updatedBase: Schema_Event_Recur_Base,
  userId: string,
) => {
  const baseForUpdate = stripBaseProps(updatedBase);
  const instResult = await mongoService.db
    .collection(Collections.EVENT)
    .updateMany(
      { "recurrence.eventId": String(baseId), user: userId },
      {
        $set: {
          ...baseForUpdate,
          updatedAt: new Date(),
        },
      },
    );
  console.log(
    `[updateSeries] Bulk updated ${instResult.modifiedCount} all-day instances for base ${baseId}`,
  );
  return instResult.modifiedCount;
};

export const updateTimedInstances = async (
  baseId: ObjectId,
  updatedBase: Schema_Event_Recur_Base,
  userId: string,
) => {
  // Strip the properties that should not change
  const baseForUpdate = stripBaseProps(updatedBase);

  // Update instances using MongoDB aggregation pipeline
  // to maintain year/day/month while updating the time
  const baseStartDate = new Date(updatedBase.startDate as string);
  const DATE_FORMAT = "%Y-%m-%dT%H:%M:%S%z";
  const baseEndDate = new Date(updatedBase.endDate as string);
  const result = await mongoService.db
    .collection(Collections.EVENT)
    .updateMany({ "recurrence.eventId": String(baseId), user: userId }, [
      {
        $set: {
          ...baseForUpdate,
          startDate: {
            $dateToString: {
              date: {
                $dateFromParts: {
                  year: { $year: { $toDate: "$startDate" } },
                  month: { $month: { $toDate: "$startDate" } },
                  day: { $dayOfMonth: { $toDate: "$startDate" } },
                  hour: { $hour: { $literal: baseStartDate } },
                  minute: { $minute: { $literal: baseStartDate } },
                  second: { $second: { $literal: baseStartDate } },
                  millisecond: {
                    $millisecond: { $literal: baseStartDate },
                  },
                },
              },
              format: DATE_FORMAT,
            },
          },
          endDate: {
            $dateToString: {
              date: {
                $dateFromParts: {
                  year: { $year: { $toDate: "$endDate" } },
                  month: { $month: { $toDate: "$endDate" } },
                  day: { $dayOfMonth: { $toDate: "$endDate" } },
                  hour: { $hour: { $literal: baseEndDate } },
                  minute: { $minute: { $literal: baseEndDate } },
                  second: { $second: { $literal: baseEndDate } },
                  millisecond: {
                    $millisecond: { $literal: baseEndDate },
                  },
                },
              },
              format: DATE_FORMAT,
            },
          },
          updatedAt: new Date(),
        },
      },
    ]);
  console.log(
    `[updateSeries] Bulk updated ${result.modifiedCount} timed instances for base ${baseId}`,
  );
};
