import { DefaultRequestBody, MockedRequest, rest, RestHandler } from "msw";
import { API_BASEURL } from "@web/common/constants/web.constants";

import { MARCH_1, MULTI_WEEK, TY_TIM } from "../events/feb27ToMar5";

// import { MARCH_1, MULTI_WEEK, TY_TIM } from "../state/state.0227To0305";

export const globalHandlers = [
  rest.get(`${API_BASEURL}/auth/oauth-url`, (req, res, ctx) => {
    return res(ctx.json({ authUrl: "foo", authState: "bar" }));
  }),
];
export const feb27ToMar5Handlers = rest.get(
  `${API_BASEURL}/event`,
  (req, res, ctx) => {
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
        ])
      );
    }
    const events = [MARCH_1, MULTI_WEEK, TY_TIM];
    return res(ctx.json(events));
  }
);
