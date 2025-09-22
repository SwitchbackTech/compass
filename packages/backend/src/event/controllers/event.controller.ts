import { ObjectId } from "mongodb";
import { SessionRequest } from "supertokens-node/framework/express";
import { Status } from "@core/errors/status.codes";
import { Logger } from "@core/logger/winston.logger";
import {
  CompassCoreEvent,
  CompassCoreEventSchema,
  CompassEvent,
  CompassEventStatus,
  Params_DeleteMany,
  Payload_Order,
  RecurringEventUpdateScope,
  Schema_Event,
} from "@core/types/event.types";
import { Res_Promise, SReqBody } from "@backend/common/types/express.types";
import eventService from "@backend/event/services/event.service";
import { CompassSyncProcessor } from "@backend/sync/services/sync/compass.sync.processor";

const logger = Logger("app.event.controllers.event.controller");

class EventController {
  private async processEvent(
    _payload: Omit<CompassEvent["payload"], "user">,
    status?: CompassEventStatus,
    applyTo: RecurringEventUpdateScope = RecurringEventUpdateScope.THIS_EVENT,
  ) {
    const payload = CompassCoreEventSchema.parse(_payload);

    const event = {
      status: status ?? CompassEventStatus.CONFIRMED,
      payload,
      applyTo,
    } as CompassEvent;

    await CompassSyncProcessor.processEvents([event]);
  }

  create = async (
    req: SReqBody<CompassCoreEvent | CompassCoreEvent[]>,
    res: Res_Promise,
  ) => {
    try {
      const { body } = req;
      const user = req.session?.getUserId() as string;

      // Handle both single object and array cases
      const events = Array.isArray(body) ? body : [body];

      // Process each event
      for (const eventData of events) {
        const _id = new ObjectId().toString();
        const event = { ...eventData, _id, user };

        const safeEvent = CompassCoreEventSchema.parse(event);

        await this.processEvent(
          safeEvent,
          CompassEventStatus.CONFIRMED,
          RecurringEventUpdateScope.THIS_EVENT,
        );
      }

      res.status(Status.NO_CONTENT).send();
    } catch (e) {
      logger.error(e);

      res.status(Status.BAD_REQUEST).send();
    }
  };

  delete = async (req: SessionRequest, res: Res_Promise) => {
    try {
      const user = req.session?.getUserId() as string;
      const _id = req.params["id"] as string;
      const event = await eventService.readById(user, _id);

      await this.processEvent(
        event as CompassEvent["payload"],
        CompassEventStatus.CANCELLED,
        (req.query["applyTo"] as RecurringEventUpdateScope) ??
          RecurringEventUpdateScope.THIS_EVENT,
      );

      res.status(Status.NO_CONTENT).send();
    } catch (e) {
      logger.error(e);

      res.status(Status.BAD_REQUEST).send();
    }
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
    try {
      const { body, query, params, session } = req;
      const user = session?.getUserId() as string;
      const _id = params["id"] as string;

      await this.processEvent(
        { ...body, user, _id } as CompassEvent["payload"],
        CompassEventStatus.CONFIRMED,
        (query["applyTo"] as RecurringEventUpdateScope) ??
          RecurringEventUpdateScope.THIS_EVENT,
      );

      res.status(Status.NO_CONTENT).send();
    } catch (e) {
      logger.error(e);

      res.status(Status.BAD_REQUEST).send();
    }
  };
}

export default new EventController();
