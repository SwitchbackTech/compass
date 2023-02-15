import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";
import { Schema_CalendarList } from "@core/types/calendar.types";

class CalendarService {
  add = async (
    integration: "google",
    calendarList: Schema_CalendarList,
    userId: string
  ) => {
    const payload = calendarList.google.items;

    const response = await mongoService.db
      .collection(Collections.CALENDARLIST)
      .updateOne(
        { user: userId },
        {
          $push: {
            [`${integration}.items`]: payload,
          },
        }
      );

    return response;
  };

  create = async (calendarList: Schema_CalendarList) => {
    return await mongoService.db
      .collection(Collections.CALENDARLIST)
      .insertOne(calendarList);
  };

  async deleteAllByUser(userId: string) {
    const filter = { user: userId };
    const response = await mongoService.db
      .collection(Collections.CALENDARLIST)
      .deleteMany(filter);

    return response;
  }

  deleteByIntegrateion = async (integration: "google", userId: string) => {
    const response = await mongoService.db
      .collection(Collections.CALENDARLIST)
      .updateOne(
        { user: userId },
        { $unset: { [`${integration}.items`]: "" } }
      );

    return response;
  };
}

export default new CalendarService();
