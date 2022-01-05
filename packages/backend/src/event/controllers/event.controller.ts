import express from "express";
import { v4 as uuidv4 } from "uuid";

import { ReqBody, Res } from "@core/types/express.types";

import { GCAL_PRIMARY } from "@backend/common/constants/backend.constants";
import { Event, Event_NoId, Params_DeleteMany } from "@core/types/event.types";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";
import { Logger } from "@backend/common/logger/common.logger";
import { getGcal } from "@backend/auth/services/google.auth.service";
import syncService from "@backend/sync/services/sync.service";
import {
  updateSyncData,
  updateNextSyncToken,
} from "@backend/sync/services/sync.helpers";
import eventService from "@backend/event/services/event.service";

const logger = Logger("app:event.controller");
class EventController {
  create = async (req: ReqBody<Event_NoId>, res: Res) => {
    const userId = res.locals.user.id;

    if (req.body instanceof Array) {
      const response = await eventService.createMany(userId, req.body);
      res.promise(Promise.resolve(response));
    } else {
      const response = await eventService.create(userId, req.body);
      res.promise(Promise.resolve(response));
    }
  };

  delete = async (req: express.Request, res: Res) => {
    const userId = res.locals.user.id;
    const eventId: string = req.params.id;
    const deleteResponse = await eventService.deleteById(userId, eventId);
    res.promise(Promise.resolve(deleteResponse));
  };

  deleteMany = async (
    // req: ReqBody<{ key: string; ids: string[] }>,
    req: ReqBody<Params_DeleteMany>,
    res: Res
  ) => {
    const userId = res.locals.user.id;
    //TODO validate body
    const deleteResponse = await eventService.deleteMany(userId, req.body);
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
      }

      const gcal = await getGcal(userId);

      const importEventsResult = await eventService.import(userId, gcal);

      const syncTokenUpdateResult = await updateNextSyncToken(
        userId,
        importEventsResult.nextSyncToken
      );

      // TODO remove 'primary-' after supporting multiple channels/user
      const channelId = `primary-${uuidv4()}`;

      const watchResult = await syncService.startWatchingChannel(
        gcal,
        GCAL_PRIMARY,
        channelId
      );

      const syncUpdate = await updateSyncData(
        userId,
        channelId,
        watchResult.resourceId,
        watchResult.expiration
      );
      const syncUpdateSummary =
        syncUpdate.ok === 1 && syncUpdate.lastErrorObject.updatedExisting
          ? "success"
          : "failed";

      const fullResults = {
        events: importEventsResult,
        sync: {
          watch: watchResult,
          nextSyncToken: syncTokenUpdateResult,
          syncDataUpdate: syncUpdateSummary,
        },
      };
      res.promise(Promise.resolve(fullResults));
    } catch (e) {
      res.promise(Promise.reject(e));
    }
  };

  readById = async (req: express.Request, res: Res) => {
    const userId = res.locals.user.id;
    const eventId: string = req.params.id;
    const response = await eventService.readById(userId, eventId);
    res.promise(Promise.resolve(response));
  };

  readAll = async (req: express.Request, res: Res) => {
    const userId = res.locals.user.id;
    const usersEvents = await eventService.readAll(userId, req.query);
    res.promise(Promise.resolve(usersEvents));
  };

  update = async (req: ReqBody<Event_NoId>, res: Res) => {
    /* 
    TODO validate: 
     - that no id in body (cuz id is immutable and will cause mongo err)
    */
    const userId = res.locals.user.id;
    const event = req.body;
    const eventId: string = req.params.id;
    const response = await eventService.updateById(userId, eventId, event);
    res.promise(Promise.resolve(response));
  };

  updateMany = async (req: ReqBody<Event[]>, res: Res) => {
    try {
      const userId = res.locals.user.id;
      const events = req.body;
      const response = await eventService.updateMany(userId, events);
      res.promise(Promise.resolve(response));
    } catch (e) {
      res.promise(Promise.reject(e));
    }
  };
}

export default new EventController();
