import { ObjectId } from "mongodb";
import { SessionRequest } from "supertokens-node/framework/express";
import { ID_OPTIMISTIC_PREFIX } from "@core/constants/core.constants";
import { Status } from "@core/errors/status.codes";
import { Logger } from "@core/logger/winston.logger";
import {
  CompassCoreEventSchema,
  CompassEvent,
  CompassEventStatus,
  CompassThisEvent,
  Params_DeleteMany,
  Payload_Order,
  RecurringEventUpdateScope,
  Schema_Event,
} from "@core/types/event.types";
import { Res_Promise, SReqBody } from "@backend/common/types/express.types";
import eventService from "@backend/event/services/event.service";
import { CompassSyncProcessor } from "@backend/sync/services/sync/compass.sync.processor";

const logger = Logger("app:event.controller");

class EventController {
  private async processEvents(_events: CompassEvent[]) {
    const events = _events.map((e) => ({
      ...e,
      payload: CompassCoreEventSchema.parse({
        ...e.payload,
        _id:
          e.payload._id?.replace(`${ID_OPTIMISTIC_PREFIX}-`, "") ??
          new ObjectId().toString(),
      }),
    })) as CompassEvent[];

    await CompassSyncProcessor.processEvents(events);
  }

  create = async (
    req: SReqBody<CompassEvent["payload"] | CompassEvent["payload"][]>,
    res: Res_Promise,
  ) => {
    const { body } = req;
    const user = req.session?.getUserId() as string;

    // Handle both single object and array cases
    const events = Array.isArray(body) ? body : [body];

    res.promise(
      this.processEvents(
        events.map((e) => ({
          payload: { ...e, user },
          status: CompassEventStatus.CONFIRMED,
          applyTo: RecurringEventUpdateScope.THIS_EVENT,
        })) as CompassEvent[],
      ).then(() => ({ statusCode: Status.NO_CONTENT })),
    );
  };

  delete = async (req: SessionRequest, res: Res_Promise) => {
    const { query } = req;
    const user = req.session?.getUserId() as string;
    const _id = req.params["id"] as string;

    res.promise(
      eventService
        .readById(user, _id)
        .then((event) => {
          const applyTo =
            query["applyTo"] ?? RecurringEventUpdateScope.THIS_EVENT;

          return this.processEvents([
            {
              payload: event as CompassThisEvent["payload"],
              status: CompassEventStatus.CANCELLED,
              applyTo: applyTo as RecurringEventUpdateScope.THIS_EVENT,
            },
          ]);
        })
        .then(() => ({ statusCode: Status.NO_CONTENT })),
    );
  };

  deleteAllByUser = async (req: SessionRequest, res: Res_Promise) => {
    const userToRemove = req.params["userId"] as string;
    try {
      const deleteAllRes = await eventService.deleteAllByUser(userToRemove);
      res.promise(deleteAllRes);
    } catch (e) {
      res.promise(Promise.reject(e));
    }
  };

  deleteMany = async (req: SReqBody<Params_DeleteMany>, res: Res_Promise) => {
    const userId = req.session?.getUserId() as string;
    try {
      const deleteResponse = await eventService.deleteMany(userId, req.body);
      res.promise(deleteResponse);
    } catch (e) {
      res.promise(Promise.reject(e));
    }
  };

  readById = async (req: SessionRequest, res: Res_Promise) => {
    const userId = req.session?.getUserId() as string;
    const eventId = req.params["id"] as string;
    try {
      const response = await eventService.readById(userId, eventId);
      res.promise(response);
    } catch (e) {
      res.promise(Promise.reject(e));
    }
  };

  readAll = async (req: SessionRequest, res: Res_Promise) => {
    const userId = req.session?.getUserId() as string;
    try {
      const usersEvents = await eventService.readAll(userId, req.query);
      res.promise(usersEvents);
    } catch (e) {
      res.promise(Promise.reject(e));
    }
  };

  reorder = async (req: SReqBody<Payload_Order[]>, res: Res_Promise) => {
    try {
      const userId = req.session?.getUserId() as string;
      const newOrder = req.body;
      const result = await eventService.reorder(userId, newOrder);
      res.promise(result);
    } catch (e) {
      res.promise(Promise.reject(e));
    }
  };

  update = async (req: SReqBody<Schema_Event>, res: Res_Promise) => {
    const { body, query, params, session } = req;
    const user = session?.getUserId() as string;
    const _id = params["id"] as string;
    const payload = { ...body, user, _id } as CompassThisEvent["payload"];
    const applyTo = query["applyTo"] as RecurringEventUpdateScope.THIS_EVENT;

    res.promise(
      this.processEvents([
        {
          payload,
          status: CompassEventStatus.CONFIRMED,
          applyTo: applyTo ?? RecurringEventUpdateScope.THIS_EVENT,
        },
      ]).then(() => ({ statusCode: Status.NO_CONTENT })),
    );
  };
}

export default new EventController();
