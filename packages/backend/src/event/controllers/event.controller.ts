import { Request } from "express";
import { ObjectId } from "mongodb";
import { SessionRequest } from "supertokens-node/framework/express";
import { Status } from "@core/errors/status.codes";
import { Logger } from "@core/logger/winston.logger";
import {
  EventSchema,
  EventStatus,
  EventUpdate,
  EventUpdateSchema,
  Params_DeleteMany,
  PrioritiesSchema,
  RecurringEventUpdateScope,
  Schema_Event,
} from "@core/types/event.types";
import { zObjectId } from "@core/types/type.utils";
import { Res_Promise, SReqBody } from "@backend/common/types/express.types";
import eventService from "@backend/event/services/event.service";
import { CompassSyncProcessor } from "@backend/sync/services/sync/compass.sync.processor";
import { Schema_Calendar } from "../../../../core/src/types/calendar.types";
import { GenericError } from "../../common/errors/generic/generic.errors";
import { error } from "../../common/errors/handlers/error.handler";

const logger = Logger("app.event.controllers.event.controller");

class EventController {
  private static ReadAllQuerySchema = EventSchema.pick({
    startDate: true,
    endDate: true,
    isSomeday: true,
  })
    .extend({ priorities: PrioritiesSchema.array().optional() })
    .partial();

  private async processEvents(_events: EventUpdate[]) {
    const events = _events.map((e) =>
      EventUpdateSchema.parse({
        ...e,
        payload: { ...e.payload, _id: e.payload._id ?? new ObjectId() },
      }),
    );

    await CompassSyncProcessor.processEvents(events);
  }

  create = async (
    req: SReqBody<EventUpdate["payload"] | EventUpdate["payload"][]>,
    res: Res_Promise,
  ) => {
    try {
      const { body, calendar } = req as SReqBody<
        EventUpdate["payload"] | EventUpdate["payload"][]
      > & { calendar: Schema_Calendar };

      // Handle both single object and array cases
      const events = Array.isArray(body) ? body : [body];

      await this.processEvents(
        events.map((event) => {
          const payload = EventSchema.parse(event);
          const allowed = calendar._id.equals(payload.calendar);

          if (!allowed) {
            throw error(GenericError.BadRequest, "unknown calendar in payload");
          }

          return {
            calendar,
            payload,
            providerSync: true,
            status: EventStatus.CONFIRMED,
            applyTo: RecurringEventUpdateScope.THIS_EVENT,
          };
        }),
      );

      res.status(Status.NO_CONTENT).send();
    } catch (e) {
      logger.error(e);

      res.status(Status.BAD_REQUEST).send();
    }
  };

  delete = async (
    req: Request<
      { calendar: string; id: string },
      unknown,
      unknown,
      { applyTo?: RecurringEventUpdateScope }
    >,
    res: Res_Promise,
  ) => {
    try {
      const { query, calendar } = req as unknown as {
        query: { applyTo?: RecurringEventUpdateScope.THIS_EVENT };
        calendar: Schema_Calendar;
      };

      const eventId = zObjectId.parse(req.params["id"]);
      const payload = await eventService.readById(calendar._id, eventId);
      const applyTo = query["applyTo"] ?? RecurringEventUpdateScope.THIS_EVENT;

      await this.processEvents([
        {
          calendar,
          payload,
          providerSync: true,
          status: EventStatus.CANCELLED,
          applyTo: applyTo,
        },
      ]);

      res.status(Status.NO_CONTENT).send();
    } catch (e) {
      logger.error(e);

      res.status(Status.BAD_REQUEST).send();
    }
  };

  deleteAllByUser = async (
    req: Request<{ user: string; calendar: string }>,
    res: Res_Promise,
  ) => {
    const userToRemove = zObjectId.parse(req.params.user);
    try {
      const deleteAllRes = await eventService.deleteAllByUser(
        userToRemove,
        (req as unknown as { calendar: Schema_Calendar }).calendar._id,
      );

      res.promise(deleteAllRes);
    } catch (e) {
      res.promise(Promise.reject(e));
    }
  };

  deleteMany = async (req: SReqBody<Params_DeleteMany>, res: Res_Promise) => {
    try {
      const { calendar } = req as unknown as { calendar: Schema_Calendar };
      const deleteResponse = await eventService.deleteMany(
        calendar._id,
        req.body,
      );

      res.promise(deleteResponse);
    } catch (e) {
      res.promise(Promise.reject(e));
    }
  };

  readById = async (req: SessionRequest, res: Res_Promise) => {
    try {
      const { calendar } = req as unknown as { calendar: Schema_Calendar };
      const eventId = zObjectId.parse(req.params["id"]);
      const response = await eventService.readById(calendar._id, eventId);

      res.promise(response);
    } catch (e) {
      res.promise(Promise.reject(e));
    }
  };

  readAll = async (
    req: Request<
      never,
      Schema_Event[],
      never,
      Pick<Schema_Event, "startDate" | "endDate" | "isSomeday"> & {
        priorities?: Schema_Event["priority"][];
      }
    >,
    res: Res_Promise,
  ) => {
    try {
      const { calendar } = req as unknown as { calendar: Schema_Calendar };
      const query = EventController.ReadAllQuerySchema.parse(req.query);
      const usersEvents = await eventService.readAll(calendar._id, query);

      res.promise(usersEvents);
    } catch (e) {
      res.promise(Promise.reject(e));
    }
  };

  reorder = async (
    req: SReqBody<Array<Pick<Schema_Event, "_id" | "order">>>,
    res: Res_Promise,
  ) => {
    try {
      const { calendar } = req as unknown as { calendar: Schema_Calendar };
      const newOrder = req.body;
      const result = await eventService.reorder(calendar._id, newOrder);

      res.promise(result);
    } catch (e) {
      res.promise(Promise.reject(e));
    }
  };

  update = async (req: SReqBody<Schema_Event>, res: Res_Promise) => {
    try {
      const { calendar, query } = req as unknown as {
        query: { applyTo?: RecurringEventUpdateScope.THIS_EVENT };
        calendar: Schema_Calendar;
      };

      const _id = zObjectId.parse(req.params["id"]);
      const payload = { ...req.body, _id };
      const applyTo = query["applyTo"] ?? RecurringEventUpdateScope.THIS_EVENT;

      await this.processEvents([
        {
          calendar,
          payload,
          providerSync: true,
          status: EventStatus.CONFIRMED,
          applyTo,
        },
      ]);

      res.status(Status.NO_CONTENT).send();
    } catch (e) {
      logger.error(e);

      res.status(Status.BAD_REQUEST).send();
    }
  };
}

export default new EventController();
