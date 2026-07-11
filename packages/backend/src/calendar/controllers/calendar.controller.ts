import { type SessionRequest } from "supertokens-node/framework/express";
import {
  type CalendarListResponse,
  SetCalendarVisibilityInputSchema,
} from "@core/types/calendar.contracts";
import { zObjectId } from "@core/types/type.utils";
import { mapCalendarRecord } from "@backend/calendar/calendar.record.mapper";
import calendarService from "@backend/calendar/services/calendar.service";
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import {
  type Res_Promise,
  type SReqBody,
} from "@backend/common/types/express.types";

class CalendarController {
  list = async (req: SessionRequest, res: Res_Promise) => {
    try {
      const userId = zObjectId.parse(req.session?.getUserId(), {
        error: () => error(AuthError.InadequatePermissions, "List Failed"),
      });

      const records = await calendarService.list(userId);
      const response: CalendarListResponse = {
        calendars: records.map(mapCalendarRecord),
      };

      res.promise(response);
    } catch (e) {
      res.promise(Promise.reject(e));
    }
  };

  setVisibility = async (req: SReqBody<unknown>, res: Res_Promise) => {
    try {
      const userId = zObjectId.parse(req.session?.getUserId(), {
        error: () => error(AuthError.InadequatePermissions, "Selection Failed"),
      });

      const items = SetCalendarVisibilityInputSchema.parse(req.body);
      await calendarService.setVisibility(userId, items);

      res.promise({ statusCode: 204 });
    } catch (e) {
      res.promise(Promise.reject(e));
    }
  };
}

export default new CalendarController();
