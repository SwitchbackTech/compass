import { ObjectId } from "mongodb";
import { type SessionRequest } from "supertokens-node/framework/express";
import { ID_OPTIMISTIC_PREFIX } from "@core/constants/core.constants";
import { Status } from "@core/errors/status.codes";
import {
  CompassCoreEventSchema,
  type CompassEvent,
  CompassEventStatus,
  type CompassThisEvent,
  type Params_DeleteMany,
  type Payload_Order,
  RecurringEventUpdateScope,
  type Schema_Event,
} from "@core/types/event.types";
import {
  type Res_Promise,
  type SReqBody,
} from "@backend/common/types/express.types";
import eventService from "@backend/event/services/event.service";
import { CompassSyncProcessor } from "@backend/sync/services/sync/compass/compass.sync.processor";

/**
 * Event controller for CRUD operations on Compass events.
 *
 * Methods use `res.promise()` instead of try/catch to ensure errors are routed
 * through the centralized error handler (handleExpressError). This is critical
 * for proper handling of Google API errors like `invalid_grant`, which triggers
 * automatic cleanup of revoked Google data and appropriate client notifications.
 */
class EventController {
  private normalizeRecurrence<T extends CompassThisEvent["payload"]>(
    payload: T,
  ): T {
    if (payload.recurrence !== null) return payload;

    return { ...payload, recurrence: { rule: null } } as T;
  }

  private async processEvents(_events: CompassEvent[]) {
    const events = _events.map((e) => ({
      ...e,
      payload: CompassCoreEventSchema.parse({
        ...this.normalizeRecurrence(e.payload),
        _id:
          e.payload._id?.replace(`${ID_OPTIMISTIC_PREFIX}-`, "") ??
          new ObjectId().toString(),
      }),
    })) as CompassEvent[];

    await CompassSyncProcessor.processEvents(events);
  }

  create = (
    req: SReqBody<CompassEvent["payload"] | CompassEvent["payload"][]>,
    res: Res_Promise,
  ) => {
    const { body } = req;
    const user = req.session?.getUserId() as string;
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

  delete = (req: SessionRequest, res: Res_Promise) => {
    const { query } = req;
    const user = req.session?.getUserId() as string;
    const _id = req.params["id"] as string;
    const applyTo = query["applyTo"] ?? RecurringEventUpdateScope.THIS_EVENT;

    res.promise(
      eventService.readById(user, _id).then((event) =>
        this.processEvents([
          {
            payload: event as CompassThisEvent["payload"],
            status: CompassEventStatus.CANCELLED,
            applyTo: applyTo as RecurringEventUpdateScope.THIS_EVENT,
          },
        ]).then(() => ({ statusCode: Status.NO_CONTENT })),
      ),
    );
  };

  deleteAllByUser = async (req: SessionRequest, res: Res_Promise) => {
    const userToRemove = req.params["userId"] as string;
    try {
      const deleteAllRes = await eventService.deleteAllByUser(userToRemove);
      res.promise(deleteAllRes);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      res.promise(Promise.reject(error));
    }
  };

  deleteMany = async (req: SReqBody<Params_DeleteMany>, res: Res_Promise) => {
    const userId = req.session?.getUserId() as string;
    try {
      const deleteResponse = await eventService.deleteMany(userId, req.body);
      res.promise(deleteResponse);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      res.promise(Promise.reject(error));
    }
  };

  readById = async (req: SessionRequest, res: Res_Promise) => {
    const userId = req.session?.getUserId() as string;
    const eventId = req.params["id"] as string;
    try {
      const response = await eventService.readById(userId, eventId);
      res.promise(response);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      res.promise(Promise.reject(error));
    }
  };

  readAll = async (req: SessionRequest, res: Res_Promise) => {
    const userId = req.session?.getUserId() as string;
    try {
      const usersEvents = await eventService.readAll(userId, req.query);
      res.promise(usersEvents);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      res.promise(Promise.reject(error));
    }
  };

  reorder = async (req: SReqBody<Payload_Order[]>, res: Res_Promise) => {
    try {
      const userId = req.session?.getUserId() as string;
      const newOrder = req.body;
      const result = await eventService.reorder(userId, newOrder);
      res.promise(result);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      res.promise(Promise.reject(error));
    }
  };

  update = (req: SReqBody<Schema_Event>, res: Res_Promise) => {
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
