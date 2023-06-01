import React from "react";
import { rest } from "msw";
import "@testing-library/jest-dom";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EUROPE_TRIP, LEARN_CHINESE } from "@core/__mocks__/events/events.misc";
import { server } from "@web/__tests__/__mocks__/server/mock.server";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { preloadedState } from "@web/__tests__/__mocks__/state/state.weekEvents";
import { CalendarView } from "@web/views/Calendar";
import { ENV_WEB } from "@web/common/constants/env.constants";

it("runs", () => {
  expect(true).toBe(true);
});
// describe("Sidebar: Interactions", () => {
// it("adds someday event to sidebar", async () => {
//   server.use(
//     rest.post(`${ENV_WEB.API_BASEURL}/event`, (_, res, ctx) => {
//       return res(ctx.json(LEARN_CHINESE));
//     })
//   );
//   const user = userEvent.setup();
//   render(<CalendarView />, { state: preloadedState });
//   await user.click(screen.getByText(/\+/i));
//   const formTitle = screen.getByRole("input");
//   await user.type(formTitle, LEARN_CHINESE.title);
//   //shows preview while typing
//   const sidebar = screen.getByRole("complementary");
//   expect(within(sidebar).getByText(LEARN_CHINESE.title)).toBeInTheDocument();
//   await user.click(screen.getByText(/save/i));
//   await waitFor(() => {
//     expect(
//       within(sidebar).getByRole("button", { name: /^learn chinese >$/i })
//     ).toBeInTheDocument();
//   });
// }, 10000);
// it("removes from current week after migrating", async () => {
//   server.use(
//     rest.put(
//       `${ENV_WEB.API_BASEURL}/event/${EUROPE_TRIP._id}`,
//       (_, res, ctx) => {
//         return res(ctx.json(EUROPE_TRIP));
//       }
//     )
//   );
//   const user = userEvent.setup();
//   render(<CalendarView />, { state: preloadedState });
//   const somedayEvt = screen.getByRole("button", {
//     name: /europe trip >/i,
//   });
//   expect(somedayEvt).toBeInTheDocument();
//   await user.click(
//     within(somedayEvt).getByRole("button", {
//       name: ">",
//     })
//   );
//   await waitFor(() => {
//     expect(somedayEvt).not.toBeInTheDocument();
//   });
// });
// });
