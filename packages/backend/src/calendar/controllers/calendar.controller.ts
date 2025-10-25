import { z } from "zod/v4";
import { Schema_Calendar } from "@core/types/calendar.types";
import { zObjectId } from "@core/types/type.utils";
import calendarService from "@backend/calendar/services/calendar.service";
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import { Res_Promise, SReqBody } from "@backend/common/types/express.types";

class CalendarController {
  create = async (req: SReqBody<Schema_Calendar>, res: Res_Promise) => {
    try {
      zObjectId.parse(req.session?.getUserId(), {
        error: () => error(AuthError.InadequatePermissions, "Create Failed"),
      });

      const response = await calendarService.create(req.body);

      res.promise(response);
    } catch (e) {
      res.promise({ error: e });
    }
  };

  list = async (
    req: SReqBody<{ calendars: Schema_Calendar[] }>,
    res: Res_Promise,
  ) => {
    try {
      const userId = zObjectId.parse(req.session?.getUserId(), {
        error: () => error(AuthError.InadequatePermissions, "List Failed"),
      });

      // Get calendars from our database first
      const userCalendars = await calendarService.getAllByUser(userId);

      res.promise({ calendars: userCalendars });
    } catch (e) {
      res.promise({ error: e });
    }
  };

  toggleSelection = async (
    req: SReqBody<Array<{ id: string; selected: boolean }>>,
    res: Res_Promise,
  ) => {
    try {
      const userId = zObjectId.parse(req.session?.getUserId(), {
        error: () => error(AuthError.InadequatePermissions, "Selection Failed"),
      });

      const calendars = req.body;

      const response = await calendarService.toggleSelection(
        userId,
        calendars.map(({ id, selected }) => ({
          id: zObjectId.parse(id),
          selected: z.boolean().parse(selected),
        })),
      );

      res.promise(response);
    } catch (e) {
      res.promise({ error: e });
    }
  };
}

export default new CalendarController();
