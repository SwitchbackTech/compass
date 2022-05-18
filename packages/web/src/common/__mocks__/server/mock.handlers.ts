import { rest } from "msw";
import { API_BASEURL } from "@web/common/constants/web.constants";

export const handlers = [
  rest.get(`${API_BASEURL}/auth/oauth-url`, (req, res, ctx) => {
    return res(ctx.json({ authUrl: "foo", authState: "bar" }));
  }),
  rest.post(`${API_BASEURL}/event`, (req, res, ctx) => {
    return res(
      ctx.json({
        _id: "6283efc54d27e090a8405d3e",
        description: "",
        isSomeday: true,
        origin: "compass",
        priority: "unassigned",
        title: "learn",
        user: "6279ae1f6df90e20e7a15ffd",
      })
    );
    // ctx.delay(150)
  }),

  /*   Mock event demo. Prefer mocking state */
  // rest.get("/api/event", (req, res, ctx) => {
  rest.get(`${API_BASEURL}/event`, (req, res, ctx) => {
    const events = [
      {
        _id: "6283efc54d27e090a8405d3e",
        description: "",
        isSomeday: true,
        origin: "compass",
        priority: "unassigned",
        title: "foo",
        user: "6279ae1f6df90e20e7a15ffd",
      },
    ];
    return res(ctx.json(events), ctx.delay(150));
  }),
  // rest.get("/user", null),
];
