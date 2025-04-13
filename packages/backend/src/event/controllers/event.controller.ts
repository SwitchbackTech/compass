import { SessionRequest } from "supertokens-node/framework/express";
import {
  Event_Core,
  Params_DeleteMany,
  Payload_Order,
  Schema_Event,
  Schema_Event_Core,
} from "@core/types/event.types";
import { validateEvent } from "@core/validators/event.validator";
import { Res_Promise, SReqBody } from "@backend/common/types/express.types";
import eventService from "@backend/event/services/event.service";

class EventController {
  create = async (req: SReqBody<Schema_Event>, res: Res_Promise) => {
    const userId = req.session?.getUserId() as string;

    try {
      if (req.body instanceof Array) {
        const events = req.body as Schema_Event[];

        const validatedEvents = events.map((event) => {
          const validated = validateEvent(event);
          return validated;
        });

        const response = await eventService.createMany(validatedEvents, {
          stripIds: true, // Don't use client-generated ids (in case they are invalid)
        });
        res.promise(response);
        return;
      }

      const event = req.body;
      validateEvent(event);

      const response = await eventService.create(userId, event as Event_Core);

      res.promise(response);
    } catch (e) {
      res.promise(Promise.reject(e));
    }
  };

  delete = async (req: SessionRequest, res: Res_Promise) => {
    const userId = req.session?.getUserId() as string;
    const eventId = req.params["id"] as string;

    try {
      const deleteResponse = await eventService.deleteById(userId, eventId);
      res.promise(deleteResponse);
    } catch (e) {
      res.promise(Promise.reject(e));
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
    const userId = req.session?.getUserId() as string;
    try {
      const event = req.body;
      validateEvent(event);

      const eventId = req.params["id"] as string;

      const response = await eventService.updateById(
        userId,
        eventId,
        event as Schema_Event_Core,
        req.query,
      );
      res.promise(response);
    } catch (e) {
      res.promise(Promise.reject(e));
    }
  };
}

export default new EventController();
