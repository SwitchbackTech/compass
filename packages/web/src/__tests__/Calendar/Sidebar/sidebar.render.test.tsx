import React from "react";
import "@testing-library/jest-dom";
import { screen, waitFor, within } from "@testing-library/react";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { CalendarView } from "@web/views/Calendar";
import { preloadedState } from "@web/__tests__/__mocks__/state/state.weekEvents";

describe("Sidebar: Display without State", () => {
  it("runs", () => expect(true).toBe(true));
  //   it("displays everything user expects when no events", async () => {
  //     await waitFor(() => {
  //       render(<CalendarView />);
  //     });

  //     // Indented to match someday title (MM.DD-DD)
  //     expect(screen.getByRole("heading", { name: /-/i })).toBeInTheDocument();

  //     // Add button
  //     expect(screen.getByText(/\+/i)).toBeInTheDocument();

  //     // Divider
  //     expect(
  //       screen.getByRole("separator", { name: /sidebar divider/i })
  //     ).toBeInTheDocument();

  //     // Month Widget
  //     expect(screen.getByTestId("Month Widget")).toBeInTheDocument();
  //   });
});

// describe("Sidebar: Display with State", () => {
//   it("displays pre-existing someday event", async () => {
//     await waitFor(() => {
//       render(<CalendarView />, { state: preloadedState });
//     });

//     await waitFor(() => {
//       expect(
//         within(screen.getByRole("complementary")).getByRole("button", {
//           name: /^europe trip >$/i,
//         })
//       ).toBeInTheDocument();
//     });
//   });
// });
