import { Origin } from "@core/constants/core.constants";
import mongoService from "@backend/common/services/mongo.service";

export const hasUpdatedCompassEventRecently = async (
  userId: string,
  deadline: string,
) => {
  const recentChanges = await mongoService.event.countDocuments({
    user: userId,
    origin: Origin.COMPASS,
    updatedAt: { $gt: new Date(deadline) },
  });

  return recentChanges > 0;
};
