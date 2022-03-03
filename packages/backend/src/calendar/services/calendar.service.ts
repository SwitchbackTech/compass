import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import { Schema_CalendarList } from "@core/types/calendar.types";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";

class CalendarService {
  async create(userId: string, calendarList: Schema_CalendarList) {
    const calListData = calendarList;
    if (!calendarList.user) {
      calListData.user = userId;
    }
    // TODO validate
    try {
      const response = await mongoService.db
        .collection(Collections.CALENDARLIST)
        .insertOne(calListData);
      return response;
    } catch (e) {
      return new BaseError(
        "Create Failed",
        JSON.stringify(e),
        Status.INTERNAL_SERVER,
        true
      );
    }
  }
}

export default new CalendarService();
