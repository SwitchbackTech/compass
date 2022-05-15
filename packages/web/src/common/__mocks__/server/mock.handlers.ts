import { rest } from "msw";
import { API_BASEURL } from "@web/common/constants/web.constants";

export const handlers = [
  rest.get(`${API_BASEURL}/auth/oauth-url`, (req, res, ctx) => {
    return res(ctx.json({ authUrl: "foo", authState: "bar" }));
  }),
  /*   Mock event demo. Prefer mocking state */
  //   rest.get("/api/event", (req, res, ctx) => {
  //     const events = [
  //       {
  //         _id: "620c177bfadfdec705cdd6a6",
  //         endDate: "2022-02-15T18:00:00-06:00",
  //        ... and all other relevant fields
  //       },
  //     ];
  //     return res(ctx.json(events));
  //   }),
  //   rest.get("/user", null),
];
