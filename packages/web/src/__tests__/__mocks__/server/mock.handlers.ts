import { ObjectId } from "bson";
import { rest } from "msw";
import { faker } from "@faker-js/faker";
import {
  CLIMB,
  EUROPE_TRIP,
  GROCERIES,
  MARCH_1,
  MULTI_WEEK,
  TY_TIM,
} from "@core/__mocks__/v1/events/events.misc";
import { Status } from "@core/errors/status.codes";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { freshenEventStartEndDate } from "@web/views/Calendar/calendar.render.test.utils";

export const globalHandlers = [
  rest.get(`${ENV_WEB.API_BASEURL}/event`, (req, res, ctx) => {
    const getSomedayEvents = req.url.searchParams.get("someday");
    if (getSomedayEvents) {
      return res(
        ctx.json([
          {
            _id: new ObjectId().toString(),
            description: "somesomesome",
            isSomeday: true,
            origin: "compass",
            priority: "unassigned",
            title: "Takeover world",
            startDate: "2025-06-09",
            endDate: "2025-06-09",
            user: "testUser",
            order: 1,
          },
          EUROPE_TRIP,
        ]),
      );
    }

    const events = [
      CLIMB,
      MARCH_1,
      MULTI_WEEK,
      TY_TIM,
      // TODO: Need some way to inject the event into globalHandlers.events in a more dynamic way.
      freshenEventStartEndDate(GROCERIES),
    ];
    return res(ctx.json(events));
  }),
  rest.delete(`${ENV_WEB.API_BASEURL}/event/:id`, (_req, res, ctx) => {
    return res(ctx.json({ acknowledged: true, deletedCount: 1 }));
  }),
  rest.options(`${ENV_WEB.API_BASEURL}/event`, (_req, res, ctx) => {
    return res(ctx.json([]));
  }),
  rest.get(`${ENV_WEB.API_BASEURL}/user/metadata`, (_req, res, ctx) => {
    return res(ctx.status(Status.OK), ctx.json({ skipOnboarding: false }));
  }),
  rest.post(`${ENV_WEB.API_BASEURL}/user/metadata`, (req, res, ctx) => {
    return res(ctx.status(Status.OK), ctx.json(req.json()));
  }),
  rest.post(`${ENV_WEB.API_BASEURL}/signinup`, (_req, res, ctx) => {
    return res(ctx.json({ isNewUser: true }));
  }),
  rest.post(`${ENV_WEB.API_BASEURL}/session/refresh`, (_req, res, ctx) => {
    ctx.set("access-token", faker.internet.jwt());
    ctx.set("front-token", faker.internet.jwt());
    ctx.set("refresh-token", faker.internet.jwt());
    ctx.cookie("sAccessToken", faker.internet.jwt());
    ctx.cookie("sFrontendToken", faker.internet.jwt());
    ctx.cookie("sRefreshToken", faker.internet.jwt());

    return res(ctx.json({ ok: true }));
  }),
];
