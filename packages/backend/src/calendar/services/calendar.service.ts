import { Schema_CalendarList } from "@core/types/calendar.types";
import mongoService from "@backend/common/services/mongo.service";

class CalendarService {
  add = async (
    integration: "google",
    calendarList: Schema_CalendarList,
    userId: string,
  ) => {
    const payload = calendarList.google.items;

    const response = await mongoService.calendar.updateOne(
      { user: userId },
      { $push: { [`${integration}.items`]: payload } },
      { upsert: true },
    );

    return response;
  };

  create = async (calendarList: Schema_CalendarList) => {
    return await mongoService.calendar.insertOne(calendarList);
  };

  async deleteAllByUser(userId: string) {
    const filter = { user: userId };
    const response = await mongoService.calendar.deleteMany(filter);

    return response;
  }

  deleteByIntegrateion = async (integration: "google", userId: string) => {
    const response = await mongoService.calendar.updateOne(
      { user: userId },
      { $unset: { [`${integration}.items`]: "" } },
    );

    return response;
  };
}

export default new CalendarService();
