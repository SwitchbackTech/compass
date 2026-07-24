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
import { syncCalendarToBrowser } from "@backend/common/services/sync-service/calendar-list.translation";
import { getEventDelegation } from "@backend/common/services/sync-service/event-routing";
import { toSyncPrincipal } from "@backend/common/services/sync-service/sync-principal";
import { getSyncServiceClient } from "@backend/common/services/sync-service/sync-service.factory";
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

// calendarIds travels as a single comma-separated query param -
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

// List the caller's calendars from the sync service and translate them to the
// browser Calendar contract. A sync failure rejects (rather than returning an
// empty list) so the browser surfaces a load error and retries, instead of
// silently hiding every calendar.
const listCalendarsFromSync = async (
  userId: string,
): Promise<CalendarListResponse> => {
  const client = getSyncServiceClient();
  if (!client) {
    throw error(GenericError.NotSure, "Sync calendar listing unavailable");
  }

  const result = await client.listCalendars(toSyncPrincipal(userId));
  if (!result.ok) {
    throw error(
      GenericError.NotSure,
      `Failed to list calendars from sync (${result.error.kind})`,
    );
  }

  return { calendars: result.value.calendars.map(syncCalendarToBrowser) };
};

class CalendarController {
  list = async (req: SessionRequest, res: Res_Promise) => {
    try {
      const userId = zObjectId.parse(req.session?.getUserId(), {
        error: () => error(AuthError.InadequatePermissions, "List Failed"),
      });

      if (getEventDelegation() === "sync") {
        const [syncResponse, localCalendar] = await Promise.all([
          listCalendarsFromSync(userId.toString()),
          calendarService.getLocalCalendar(userId),
        ]);

        res.promise({
          calendars: localCalendar
            ? [
                ...syncResponse.calendars,
                mapCalendarRecord(localCalendar),
              ]
            : syncResponse.calendars,
        });
        return;
      }

      res.promise({
        calendars: (await calendarService.list(userId)).map(mapCalendarRecord),
      });
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
