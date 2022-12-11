//@ts-nocheck
import { SessionRequest } from "supertokens-node/framework/express";
import { SReqBody, Res } from "@core/types/express.types";
import { Schema_Event, Params_DeleteMany } from "@core/types/event.types";
import { BaseError } from "@core/errors/errors.base";
import { Status } from "@core/errors/status.codes";
import { Logger } from "@core/logger/winston.logger";
import { deleteAllSyncData } from "@backend/sync/services/sync.service.helpers";
import eventService from "@backend/event/services/event.service";

const logger = Logger("app:event.controller");

class EventController {
  create = async (req: SReqBody<Schema_Event>, res: Res) => {
    const userId = req.session?.getUserId();

    try {
      if (req.body instanceof Array) {
        const response = await eventService.createMany(req.body);
        //@ts-ignore
        res.promise(Promise.resolve(response));
      } else {
        const response = await eventService.create(userId, req.body);
        //@ts-ignore
        res.promise(Promise.resolve(response));
      }
    } catch (e) {
      logger.error(e);
      const _e = e as BaseError;
      if (_e.statusCode === Status.GONE) {
        await deleteAllSyncData(userId);
      }
      //@ts-ignore
      res.promise(e);
    }
  };

  delete = async (req: SessionRequest, res: Res) => {
    const userId = req.session?.getUserId();
    try {
      const eventId: string = req.params.id;
      const deleteResponse = await eventService.deleteById(userId, eventId);
      //@ts-ignore
      res.promise(Promise.resolve(deleteResponse));
    } catch (e) {
      logger.error(e);
      const _e = e as BaseError;
      if (_e.statusCode === Status.GONE) {
        await deleteAllSyncData(userId);
      }
      //@ts-ignore
      res.promise(e);
    }
  };

  deleteAllByUser = async (req: SessionRequest, res: Res) => {
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

  deleteMany = async (req: SReqBody<Params_DeleteMany>, res: Res) => {
    const userId = req.session?.getUserId();
    //TODO validate body
    const deleteResponse = await eventService.deleteMany(userId, req.body);
    //@ts-ignore
    res.promise(Promise.resolve(deleteResponse));
  };

  readById = async (req: SessionRequest, res: Res) => {
    const userId = req.session?.getUserId();
    //@ts-ignore
    const eventId: string = req.params.id;
    const response = await eventService.readById(userId, eventId);
    res.promise(Promise.resolve(response));
  };

  readAll = async (req: SessionRequest, res: Res) => {
    const userId = req.session?.getUserId();
    const usersEvents = await eventService.readAll(userId, req.query);
    res.promise(Promise.resolve(usersEvents));
  };

  update = async (req: SReqBody<Schema_Event>, res: Res) => {
    const userId = req.session?.getUserId() as string;
    try {
      const event = req.body;
      const eventId: string = req.params.id;

      const response = await eventService.updateById(userId, eventId, event);
      //@ts-ignore
      res.promise(Promise.resolve(response));
    } catch (e) {
      logger.error(e);
      const _e = e as BaseError;
      if (_e.statusCode === Status.GONE) {
        await deleteAllSyncData(userId);
      }
      res.promise(e);
    }
  };

  updateMany = async (req: SReqBody<Schema_Event[]>, res: Res) => {
    try {
      const userId = req.session?.getUserId();
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

/*
start of a convenience method for how to wipe and 
reimport resources (events, calendarlists, settings)
after receiving a 410 GONE error from google's notification



  reimport = async (req: express.Request, res: Res) => {
    try {
      //TODO: only call this when getting 410
      // gone error from gcal
      const userId: string = req.session?.getUserId();

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

      const syncTokenUpdateResult = await syncService.updateSyncToken(
        userId,
        "events",
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
        sync: {import { syncService } from '@backend/sync/services/sync.service';

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

export interface Result_Watch_Start {
  channel: gSchema$Channel;
  saveForDev?: "success" | "failed";
  syncUpdate: ModifyResult;
}

export interface Result_Watch_Stop {
  stopWatching: {
    result: string;
    channelId?: string;
    resourceId?: string;
    debug?: object;
  };
  deleteWatch: Result_Watch_Delete;
}


*/
