import { NextFunction, Request, Response } from "express";
import { ZodError, z } from "zod/v4";
import { Status } from "@core/errors/status.codes";
import { CompassCalendarSchema } from "@core/types/calendar.types";
import { zObjectId } from "@core/types/type.utils";
import calendarService from "@backend/calendar/services/calendar.service";
import { error } from "@backend/common/errors/handlers/error.handler";

export class EventMiddleware {
  static async verifyUserCalendar(
    req: Request<{ calendar?: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const id = req.params.calendar;
      const user = zObjectId.parse(req.session?.getUserId());
      const _id = zObjectId.parse(id, { error: () => "Invalid Calendar ID" });
      const calendar = await calendarService.getByUser(user, _id);

      Object.assign(req, {
        calendar: CompassCalendarSchema.parse(calendar, {
          error: () => "Calendar not found",
        }),
      });

      next();
    } catch (e) {
      if (error instanceof ZodError) {
        res.status(Status.UNAUTHORIZED).json(z.treeifyError(error));
      } else {
        next(e);
      }
    }
  }
}
