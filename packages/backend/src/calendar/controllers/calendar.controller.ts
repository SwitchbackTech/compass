import express from "express";

import { Logger } from "@common/logger/common.logger";
import { Res } from "@compass/core/src/types/express.types";
import { Schema_Calendar } from "@compass/core/src/types/calendar.types";
import gcalService from "@common/services/gcal/gcal.service";
import mongoService from "@common/services/mongo.service";
import { Collections } from "@common/constants/collections";
import { getGcal } from "@auth/services/google.auth.service";

const logger = Logger("app:calendar.controller");

class CalendarController {
  list = async (req: express.Request, res: Res) => {
    const userId = res.locals.user.id;
    const gcal = await getGcal(userId);
    const response = await gcalService.listCalendars(gcal);
    res.promise(Promise.resolve(response));
  };

  testingSetup = async (req: express.Request, res: Res) => {
    const userId = res.locals.user.id;
    const data: Schema_Calendar = {
      user: userId,
      google: {
        nextSyncToken: "calendarListSyncToken",
        items: [
          {
            id: "27th kdkdkdkkd",
            summary: "My Primary",
            description: "hardCoded testing",
            sync: {
              channelId: "foo",
              resourceId: "bb",
              nextSyncToken: "883838jjjj",
              expiration: "somestring",
            },
          },
          {
            primary: true, // this doesnt appear for all non-primary cals
            id: "27th iiiiiii",
            summary: "27th work",
            description: "just work stuff here",
            sync: {
              channelId: "bar",
              resourceId: "wiwk",
              nextSyncToken: "bnamske",
              expiration: "string2",
            },
          },
        ],
      },
    };
    const response = await mongoService.db
      .collection(Collections.CALENDAR)
      .insertOne(data);
    res.promise(Promise.resolve(response));
  };
}

export default new CalendarController();
