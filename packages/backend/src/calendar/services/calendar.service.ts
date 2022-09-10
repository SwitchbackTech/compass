import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";
import { Schema_CalendarList } from "@core/types/calendar.types";

class CalendarService {
  async create(calendarList: Schema_CalendarList) {
    //--
    // if (calendarList instanceof Array) {
    //   return await mongoService.db
    //     .collection(Collections.CALENDARLIST)
    //     .insertMany(calendarList);
    // }

    return await mongoService.db
      .collection(Collections.CALENDARLIST)
      .insertOne(calendarList);
  }

  async deleteAllByUser(userId: string) {
    const filter = { user: userId };
    const response = await mongoService.db
      .collection(Collections.CALENDARLIST)
      .deleteMany(filter);
    return response;
  }
}

export default new CalendarService();
