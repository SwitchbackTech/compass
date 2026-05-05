import { type ClientSession } from "mongodb";
import dayjs from "@core/util/date/dayjs";
import mongoService from "@backend/common/services/mongo.service";

export const isWatchingGoogleResource = async (
  userId: string,
  gCalendarId: string,
  session?: ClientSession,
) => {
  const watch = await mongoService.watch.findOne(
    { user: userId, gCalendarId },
    { session },
  );

  if (!watch) return false;

  const expired = dayjs(watch.expiration).isSameOrBefore(dayjs());

  if (expired) {
    await mongoService.watch.deleteOne(
      { user: userId, gCalendarId },
      { session },
    );

    return false;
  }

  return true;
};
