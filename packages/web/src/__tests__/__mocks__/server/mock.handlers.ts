import { faker } from "@faker-js/faker";
import { rest } from "msw";
import { Origin } from "@core/constants/core.constants";
import { Status } from "@core/errors/status.codes";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { freshenEventStartEndDate } from "@web/views/Week/week-view.render.test.utils";

export const globalHandlers = [
  rest.get("http://localhost/version.json", (_req, res, ctx) => {
    return res(ctx.json({ version: "dev" }));
  }),
  rest.get(`${ENV_WEB.API_BASEURL}/event`, (_req, res, ctx) => {
    const events = [
      createMockStandaloneEvent({ origin: Origin.GOOGLE_IMPORT }),
      createMockStandaloneEvent({ origin: Origin.GOOGLE_IMPORT }, true),
      createMockStandaloneEvent(
        { origin: Origin.GOOGLE_IMPORT, isAllDay: true },
        true,
        { value: 21, unit: "days" },
      ),
      createMockStandaloneEvent({ origin: Origin.GOOGLE_IMPORT }),
      freshenEventStartEndDate(
        createMockStandaloneEvent({ origin: Origin.GOOGLE_IMPORT }),
      ),
    ];
    return res(ctx.json(events));
  }),
  rest.delete(`${ENV_WEB.API_BASEURL}/event/:id`, (_req, res, ctx) => {
    return res(ctx.json({ acknowledged: true, deletedCount: 1 }));
  }),
  rest.options(`${ENV_WEB.API_BASEURL}/event`, (_req, res, ctx) => {
    return res(ctx.json([]));
  }),
  rest.get(`${ENV_WEB.API_BASEURL}/user/profile`, (_req, res, ctx) => {
    return res(
      ctx.status(Status.OK),
      ctx.json({
        userId: "test-user-123",
        email: "test@example.com",
        name: faker.person.fullName(),
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        photo: faker.image.avatar(),
      }),
    );
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
    return res(
      ctx.set("access-token", faker.internet.jwt()),
      ctx.set("front-token", faker.internet.jwt()),
      ctx.set("refresh-token", faker.internet.jwt()),
      ctx.cookie("sAccessToken", faker.internet.jwt()),
      ctx.cookie("sFrontendToken", faker.internet.jwt()),
      ctx.cookie("sRefreshToken", faker.internet.jwt()),
      ctx.json({ ok: true }),
    );
  }),
];
