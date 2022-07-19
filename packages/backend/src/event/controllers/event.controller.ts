//@ts-nocheck
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { ReqBody, Res } from "@core/types/express.types";
import { Status } from "@core/errors/status.codes";
import { BaseError } from "@core/errors/errors.base";
import { Logger } from "@core/logger/winston.logger";
import { Schema_Event, Params_DeleteMany } from "@core/types/event.types";
import { GCAL_PRIMARY } from "@backend/common/constants/backend.constants";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";
import { getGcalOLD } from "@backend/auth/services/OLDgoogle.auth.service";
import syncService from "@backend/sync/services/sync.service";
import eventService from "@backend/event/services/event.service";
import { Result_Watch_Stop_All } from "@core/types/sync.types";

const logger = Logger("app:event.controller");
class EventController {
  create = async (req: ReqBody<Schema_Event>, res: Res) => {
    const userId = res.locals.user.id;

    if (req.body instanceof Array) {
      const response = await eventService.createMany(userId, req.body);
      //@ts-ignore
      res.promise(Promise.resolve(response));
    } else {
      const response = await eventService.create(userId, req.body);
      //@ts-ignore
      res.promise(Promise.resolve(response));
    }
  };

  delete = async (req: express.Request, res: Res) => {
    const userId = res.locals.user.id;
    //@ts-ignore
    const eventId: string = req.params.id;
    const deleteResponse = await eventService.deleteById(userId, eventId);
    //@ts-ignore
    res.promise(Promise.resolve(deleteResponse));
  };

  deleteAllByUser = async (req: express.Request, res: Res) => {
    // const userMakingRequest = res.locals.user.id;
    // if (userMakingRequest !== userToRemove) {
    //check if user is an app admin?
    // res.promise(Promise.resolve("ignored cuz its not your (current) user"));
    // }
    const userToRemove: string = req.params.userId;
    const deleteAllRes = await eventService.deleteAllByUser(userToRemove);
    //@ts-ignore
    res.promise(Promise.resolve(deleteAllRes));
  };

  deleteMany = async (
    // req: ReqBody<{ key: string; ids: string[] }>,
    req: ReqBody<Params_DeleteMany>,
    res: Res
  ) => {
    const userId = res.locals.user.id;
    //TODO validate body
    const deleteResponse = await eventService.deleteMany(userId, req.body);
    //@ts-ignore
    res.promise(Promise.resolve(deleteResponse));
  };

  import = async (req: express.Request, res: Res) => {
    try {
      const userId: string = res.locals.user.id;

      const userExists = await mongoService.recordExists(Collections.USER, {
        _id: mongoService.objectId(userId),
      });
      if (userExists) {
        logger.debug(`Deleting events for clean import for user: ${userId}`);
        await eventService.deleteAllByUser(userId);

        logger.debug(`Clearing watches before import for user: ${userId}`);
        const stopWatchesRes = (await syncService.stopAllChannelWatches(
          userId
        )) as Result_Watch_Stop_All;
        if (stopWatchesRes.summary !== "success") {
          throw new BaseError(
            "Import Failed",
            `failed to stop existing watches because: ${
              stopWatchesRes.message || "unsure"
            }`,
            Status.INTERNAL_SERVER,
            false
          );
        }
      }

      const gcal = await getGcalOLD(userId);

      const importEventsResult = await eventService.import(userId, gcal);

      const syncTokenUpdateResult = await syncService.updateNextSyncToken(
        userId,
        importEventsResult.nextSyncToken
      );

      const { watchResult, syncUpdate } =
        await syncService.startWatchingCalendar(gcal, userId, GCAL_PRIMARY);

      const syncUpdateSummary =
        //@ts-ignore
        syncUpdate.ok === 1 && syncUpdate.lastErrorObject.updatedExisting
          ? "success"
          : "failed";

      const fullResults = {
        events: importEventsResult,
        sync: {
          watch: watchResult,
          nextSyncToken: syncTokenUpdateResult,
          syncDataUpdate: syncUpdate,
        },
      };
      //@ts-ignore
      res.promise(Promise.resolve(fullResults));
    } catch (e) {
      //@ts-ignore
      res.promise(Promise.reject(e));
    }
  };

  readById = async (req: express.Request, res: Res) => {
    const userId = res.locals.user.id;
    //@ts-ignore
    const eventId: string = req.params.id;
    const response = await eventService.readById(userId, eventId);
    res.promise(Promise.resolve(response));
  };

  readAll = async (req: express.Request, res: Res) => {
    const userId = res.locals.user.id;
    const usersEvents = await eventService.readAll(userId, req.query);
    //@ts-ignore
    res.promise(Promise.resolve(usersEvents));
  };

  update = async (req: ReqBody<Schema_Event>, res: Res) => {
    const userId = res.locals.user.id;
    const event = req.body;
    //@ts-ignore
    const eventId: string = req.params.id;
    const response = await eventService.updateById(userId, eventId, event);
    //@ts-ignore
    res.promise(Promise.resolve(response));
  };

  updateMany = async (req: ReqBody<Schema_Event[]>, res: Res) => {
    try {
      const userId = res.locals.user.id;
      const events = req.body;
      const response = await eventService.updateMany(userId, events);
      //@ts-ignore
      res.promise(Promise.resolve(response));
    } catch (e) {
      //@ts-ignore
      res.promise(Promise.reject(e));
    }
  };
}

export default new EventController();
