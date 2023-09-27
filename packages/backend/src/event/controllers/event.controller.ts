import { SessionRequest } from "supertokens-node/framework/express";
import {
  Schema_Event,
  Params_DeleteMany,
  Payload_Order,
} from "@core/types/event.types";
import { SReqBody, Res_Promise } from "@backend/common/types/express.types";
import eventService from "@backend/event/services/event.service";

class EventController {
  create = async (req: SReqBody<Schema_Event>, res: Res_Promise) => {
    const userId = req.session?.getUserId() as string;

    try {
      if (req.body instanceof Array) {
        const response = await eventService.createMany(req.body);
        res.promise(response);
        return;
      }

      const response = await eventService.create(userId, req.body);

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
      const eventId = req.params["id"] as string;

      const response = await eventService.updateById(
        userId,
        eventId,
        event,
        req.query
      );
      res.promise(response);
    } catch (e) {
      res.promise(Promise.reject(e));
    }
  };
}

export default new EventController();
