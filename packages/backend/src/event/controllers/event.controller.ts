import { type Request, type Response } from "express";
import { type SessionRequest } from "supertokens-node/framework/express";
import { Status } from "@core/errors/status.codes";
import {
  CreateEventInputSchema,
  DeleteEventInputSchema,
  type EventListQuery,
  EventListQuerySchema,
  ReplaceEventInputSchema,
} from "@core/types/event-command.contracts";
import { toEventMutationError } from "@backend/event/event.error";
import { mapEventRecord } from "@backend/event/event.record.mapper";
import eventService from "@backend/event/services/event.service";

const send = (res: Response, e: unknown) => {
  const { status, body } = toEventMutationError(e);
  res.status(status).json(body);
};

const parseListQuery = (query: Request["query"]): EventListQuery => {
  const priorities =
    typeof query["priorities"] === "string" && query["priorities"].length > 0
      ? query["priorities"].split(",")
      : [];

  return EventListQuerySchema.parse({
    kind: "range",
    start: query["start"],
    end: query["end"],
    priorities,
  });
};

class EventController {
  readAll = async (req: SessionRequest, res: Response) => {
    try {
      const userId = req.session?.getUserId() as string;
      const query = parseListQuery(req.query);
      const events = await eventService.readAll(userId, query);

      res.status(Status.OK).json({ events: events.map(mapEventRecord) });
    } catch (e) {
      send(res, e);
    }
  };

  readById = async (req: SessionRequest, res: Response) => {
    try {
      const userId = req.session?.getUserId() as string;
      const eventId = req.params["id"] as string;
      const event = await eventService.readById(userId, eventId);

      res.status(Status.OK).json({ event: mapEventRecord(event) });
    } catch (e) {
      send(res, e);
    }
  };

  create = async (req: SessionRequest, res: Response) => {
    try {
      const userId = req.session?.getUserId() as string;
      const input = CreateEventInputSchema.parse(req.body);
      const event = await eventService.create(userId, input);

      res.status(Status.OK).json({ event: mapEventRecord(event) });
    } catch (e) {
      send(res, e);
    }
  };

  replace = async (req: SessionRequest, res: Response) => {
    try {
      const userId = req.session?.getUserId() as string;
      const eventId = req.params["id"] as string;
      const input = ReplaceEventInputSchema.parse(req.body);
      const event = await eventService.replace(userId, eventId, input);

      res.status(Status.OK).json({ event: mapEventRecord(event) });
    } catch (e) {
      send(res, e);
    }
  };

  delete = async (req: SessionRequest, res: Response) => {
    try {
      const userId = req.session?.getUserId() as string;
      const eventId = req.params["id"] as string;
      const scopeParam = req.query["scope"];
      const input = DeleteEventInputSchema.parse({
        scope: typeof scopeParam === "string" ? scopeParam : "this",
      });

      await eventService.delete(userId, eventId, input);

      res.status(Status.NO_CONTENT).send();
    } catch (e) {
      send(res, e);
    }
  };

  deleteAllByUser = async (req: SessionRequest, res: Response) => {
    try {
      const userToRemove = req.params["userId"] as string;
      const result = await eventService.deleteAllByUser(userToRemove);

      res.status(Status.OK).json(result);
    } catch (e) {
      send(res, e);
    }
  };
}

export default new EventController();
