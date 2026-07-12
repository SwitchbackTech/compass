import { type SessionRequest } from "supertokens-node/framework/express";
import {
  type CalendarListResponse,
  SetCalendarVisibilityInputSchema,
} from "@core/types/calendar.contracts";
import {
  type AvailabilityQuery,
  AvailabilityQuerySchema,
} from "@core/types/event-command.contracts";
import { zObjectId } from "@core/types/type.utils";
import { mapCalendarRecord } from "@backend/calendar/calendar.record.mapper";
import calendarService from "@backend/calendar/services/calendar.service";
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import { GenericError } from "@backend/common/errors/generic/generic.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import {
  type Res_Promise,
  type SReqBody,
} from "@backend/common/types/express.types";

// A7 "bounded": AvailabilityQuerySchema (core) only enforces end > start, not
// a maximum span - an unbounded range would let one request fan a Google
// freebusy call out across an arbitrary window. Kept as a small local check
// rather than a core-contract change (packet 08 phase 4).
const MAX_AVAILABILITY_RANGE_DAYS = 62;

const assertBoundedAvailabilityRange = (query: AvailabilityQuery) => {
  const rangeMs = Date.parse(query.end) - Date.parse(query.start);
  const maxMs = MAX_AVAILABILITY_RANGE_DAYS * 24 * 60 * 60 * 1000;

  if (rangeMs > maxMs) {
    throw error(
      GenericError.BadRequest,
      `Availability range must not exceed ${MAX_AVAILABILITY_RANGE_DAYS} days`,
    );
  }
};

// calendarIds travels as a single comma-separated query param (mirrors
// EventListQuery's `priorities`, see event.controller.ts's parseListQuery) -
// the web api client (availability.api.ts) must format requests this way.
const parseAvailabilityQuery = (query: SessionRequest["query"]) => {
  const calendarIdsParam = query["calendarIds"];
  const calendarIds =
    typeof calendarIdsParam === "string" && calendarIdsParam.length > 0
      ? calendarIdsParam.split(",")
      : [];

  return AvailabilityQuerySchema.parse({
    calendarIds,
    start: query["start"],
    end: query["end"],
  });
};

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

  availability = async (req: SessionRequest, res: Res_Promise) => {
    try {
      const userId = zObjectId.parse(req.session?.getUserId(), {
        error: () =>
          error(AuthError.InadequatePermissions, "Availability Failed"),
      });

      const query = parseAvailabilityQuery(req.query);
      assertBoundedAvailabilityRange(query);

      const response = await calendarService.getAvailability(userId, query);

      res.promise(response);
    } catch (e) {
      res.promise(Promise.reject(e));
    }
  };
}

export default new CalendarController();
