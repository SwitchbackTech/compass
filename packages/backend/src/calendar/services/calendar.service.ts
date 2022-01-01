import { Collections } from "@common/constants/collections";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import { Logger } from "@common/logger/common.logger";
import mongoService from "@common/services/mongo.service";
import { Schema_CalendarList } from "@core/types/calendar.types";

const logger = Logger("app:calendar.service");

class CalendarService {
  async create(userId: string, calendarList: Schema_CalendarList) {
    // TODO validate
    try {
      const response = await mongoService.db
        .collection(Collections.CALENDARLIST)
        .insertOne(calendarList);
      return response;
    } catch (e) {
      return new BaseError("Create Failed", e, Status.INTERNAL_SERVER, true);
    }
  }
}

export default new CalendarService();
