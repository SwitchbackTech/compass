import { SessionRequest } from "supertokens-node/framework/express";
import { SReqBody, Res } from "@backend/common/types/express.types";
import {
  Schema_Event,
  Params_DeleteMany,
  Payload_Order,
} from "@core/types/event.types";
import eventService from "@backend/event/services/event.service";

class EventController {
  create = async (req: SReqBody<Schema_Event>, res: Res) => {
    const userId = req.session?.getUserId() as string;

    try {
      if (req.body instanceof Array) {
        const response = await eventService.createMany(req.body);
        //@ts-ignore
        res.promise(Promise.resolve(response));
        return;
      }

      const response = await eventService.create(userId, req.body);

      //@ts-ignore
      res.promise(Promise.resolve(response));
    } catch (e) {
      //@ts-ignore
      res.promise(Promise.reject(e));
    }
  };

  delete = async (req: SessionRequest, res: Res) => {
    const userId = req.session?.getUserId() as string;
    const eventId = req.params["id"] as string;

    try {
      const deleteResponse = await eventService.deleteById(userId, eventId);
      //@ts-ignore
      res.promise(Promise.resolve(deleteResponse));
    } catch (e) {
      //@ts-ignore
      res.promise(Promise.reject(e));
    }
  };

  deleteAllByUser = async (req: SessionRequest, res: Res) => {
    const userToRemove = req.params["userId"] as string;
    try {
      const deleteAllRes = await eventService.deleteAllByUser(userToRemove);
      //@ts-ignore
      res.promise(Promise.resolve(deleteAllRes));
    } catch (e) {
      //@ts-ignore
      res.promise(Promise.reject(e));
    }
  };

  deleteMany = async (req: SReqBody<Params_DeleteMany>, res: Res) => {
    const userId = req.session?.getUserId() as string;
    try {
      const deleteResponse = await eventService.deleteMany(userId, req.body);
      //@ts-ignore
      res.promise(Promise.resolve(deleteResponse));
    } catch (e) {
      //@ts-ignore
      res.promise(Promise.reject(e));
    }
  };

  readById = async (req: SessionRequest, res: Res) => {
    const userId = req.session?.getUserId() as string;
    const eventId = req.params["id"] as string;
    try {
      const response = await eventService.readById(userId, eventId);
      //@ts-ignore
      res.promise(Promise.resolve(response));
    } catch (e) {
      //@ts-ignore
      res.promise(Promise.reject(e));
    }
  };

  readAll = async (req: SessionRequest, res: Res) => {
    const userId = req.session?.getUserId() as string;
    try {
      const usersEvents = await eventService.readAll(userId, req.query);
      //@ts-ignore
      res.promise(Promise.resolve(usersEvents));
    } catch (e) {
      //@ts-ignore
      res.promise(Promise.reject(e));
    }
  };

  reorder = async (req: SReqBody<Payload_Order[]>, res: Res) => {
    try {
      const userId = req.session?.getUserId() as string;
      const newOrder = req.body;
      const result = await eventService.reorder(userId, newOrder);
      //@ts-ignore
      res.promise(Promise.resolve(result));
    } catch (e) {
      //@ts-ignore
      res.promise(Promise.reject(e));
    }
  };

  update = async (req: SReqBody<Schema_Event>, res: Res) => {
    const userId = req.session?.getUserId() as string;
    try {
      const event = req.body;
      const eventId = req.params["id"] as string;

      const response = await eventService.updateById(userId, eventId, event);
      //@ts-ignore
      res.promise(Promise.resolve(response));
    } catch (e) {
      //@ts-ignore
      res.promise(Promise.reject(e));
    }
  };

  updateMany = async (req: SReqBody<Schema_Event[]>, res: Res) => {
    try {
      const userId = req.session?.getUserId() as string;
      const events = req.body;
      const response = await eventService.updateMany(userId, events);
      //@ts-ignore
      res.promise(Promise.resolve(response));
    } catch (e) {
      //@ts-ignore
      res.promise(e);
    }
  };
}

export default new EventController();
