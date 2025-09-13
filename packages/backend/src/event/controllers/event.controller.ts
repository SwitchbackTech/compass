import { ObjectId } from "mongodb";
import { SessionRequest } from "supertokens-node/framework/express";
import { Status } from "@core/errors/status.codes";
import { Logger } from "@core/logger/winston.logger";
import {
  CompassEvent,
  CompassEventStatus,
  Event_Core,
  Params_DeleteMany,
  Payload_Order,
  RecurringEventUpdateScope,
  Schema_Event,
  Schema_Event_Core,
} from "@core/types/event.types";
import { validateEvent } from "@core/validators/event.validator";
import { Res_Promise, SReqBody } from "@backend/common/types/express.types";
import eventService from "@backend/event/services/event.service";
import { CompassSyncProcessor } from "@backend/sync/services/sync/compass.sync.processor";

const logger = Logger("app.event.controllers.event.controller");

class EventController {
  private async processEvent(
    eventId: string,
    userId: string,
    update: Schema_Event_Core,
    status?: CompassEventStatus,
    applyTo?: RecurringEventUpdateScope,
  ) {
    const payload = validateEvent(update) as Event_Core & { recurrence: never };

    const event: CompassEvent = {
      eventId,
      userId,
      status: status ?? CompassEventStatus.CONFIRMED,
      payload,
      applyTo,
    };

    await CompassSyncProcessor.processEvents([event]);
  }

  create = async (req: SReqBody<Schema_Event>, res: Res_Promise) => {
    try {
      await this.processEvent(
        new ObjectId().toString(),
        req.session?.getUserId() as string,
        req.body as Schema_Event_Core,
        CompassEventStatus.CONFIRMED,
        req.query["applyTo"] as RecurringEventUpdateScope,
      );

      res.status(Status.NO_CONTENT).send();
    } catch (e) {
      logger.error(e);

      res.status(Status.BAD_REQUEST).send();
    }
  };

  delete = async (req: SessionRequest, res: Res_Promise) => {
    try {
      const userId = req.session?.getUserId() as string;
      const eventId = req.params["id"] as string;
      const event = await eventService.readById(userId, eventId);

      await this.processEvent(
        event._id.toString(),
        req.session?.getUserId() as string,
        event as Schema_Event_Core,
        CompassEventStatus.CANCELLED,
        req.query["applyTo"] as RecurringEventUpdateScope,
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
      const userId = req.session?.getUserId() as string;
      const eventId = req.params["id"] as string;
      const event = req.body as Schema_Event_Core;

      await this.processEvent(
        eventId,
        userId,
        event,
        CompassEventStatus.CONFIRMED,
        req.query["applyTo"] as RecurringEventUpdateScope,
      );

      res.status(Status.NO_CONTENT).send();
    } catch (e) {
      logger.error(e);

      res.status(Status.BAD_REQUEST).send();
    }
  };
}

export default new EventController();
