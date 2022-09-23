import { rest } from "msw";
import { ENV_WEB } from "@web/common/constants/env.constants";
import {
  CLIMB,
  EUROPE_TRIP,
  GROCERIES,
  MARCH_1,
  MULTI_WEEK,
  TY_TIM,
} from "@core/__mocks__/events/events.misc";

export const globalHandlers = [
  rest.get(`${ENV_WEB.API_BASEURL}/event`, (req, res, ctx) => {
    const getSomedayEvents = req.url.searchParams.get("someday");
    if (getSomedayEvents) {
      return res(
        ctx.json([
          {
            _id: "somedayFoo",
            description: "somesomesome",
            isSomeday: true,
            origin: "compass",
            priority: "unassigned",
            title: "Takeover world",
          },
          EUROPE_TRIP,
        ])
      );
    }

    const events = [CLIMB, MARCH_1, MULTI_WEEK, TY_TIM, GROCERIES];
    return res(ctx.json(events));
  }),
  rest.delete(`${ENV_WEB.API_BASEURL}/event/:id`, (req, res, ctx) => {
    return res(ctx.json({ acknowledged: true, deletedCount: 1 }));
  }),
  rest.options(`${ENV_WEB.API_BASEURL}/event`, (req, res, ctx) => {
    return res(ctx.json([]));
  }),
];
