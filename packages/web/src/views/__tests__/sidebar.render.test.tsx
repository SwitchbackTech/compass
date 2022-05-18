import React from "react";
import { server } from "@web/common/__mocks__/server/mock.server";
import { sagas } from "@web/store/sagas";
import { sagaMiddleware } from "@web/common/store/middlewares";
import { Provider } from "react-redux";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import "@testing-library/jest-dom";
import {
  act,
  prettyDOM,
  // render as rtlRender,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { render } from "@web/common/__mocks__/mock.render";
import { weekEventState } from "@web/common/__mocks__/state/state.weekEvents";
import {
  mockLocalStorage,
  clearLocalStorageMock,
  mockScroll,
} from "@web/common/utils/test.util";
import { CalendarView } from "@web/views/Calendar";
import userEvent from "@testing-library/user-event";

import { store } from "../../store/index";

describe("Sidebar", () => {
  beforeAll(() => {
    mockLocalStorage();
    mockScroll();
    localStorage.setItem("token", "secretTokenValue");
  });
  afterAll(() => {
    clearLocalStorageMock();
  });
  it("displays everything user expects when no events", async () => {
    await waitFor(() => {
      render(<CalendarView />);
    });

    // Someday title
    expect(
      screen.getByRole("heading", { name: /someday/i })
    ).toBeInTheDocument();

    // Add button
    expect(screen.getByText(/\+/i)).toBeInTheDocument();

    // Divider
    expect(
      screen.getByRole("separator", { name: /sidebar divider/i })
    ).toBeInTheDocument();

    // Month Widget
    expect(
      screen.getByRole("dialog", { name: /month widget/i })
    ).toBeInTheDocument();
  });

  it.todo("collapses sidebar after clicking toggle button");

  it("adds someday event to sidebar", async () => {
    // sagaMiddleware.run(sagas);
    server.listen();
    // server.printHandlers();

    const user = userEvent.setup();
    await waitFor(() => {
      render(<CalendarView />);
      // render(<CalendarView />, { state: weekEventState });
      // rtlRender(
      //   <DndProvider backend={HTML5Backend}>
      //     <Provider store={store}>
      //       <CalendarView />
      //     </Provider>
      //   </DndProvider>
      // );
    });

    const sidebar = screen.getByRole("complementary");
    await act(async () => {
      await user.click(
        within(sidebar).getByRole("button", { name: /add someday event/i })
      );
    });

    await act(async () => {
      // await user.type(screen.getByPlaceholderText(/title/i), "learn");
      // debug();
      // console.log(prettyDOM(sidebar, 10000));
      await user.type(screen.getByRole("input", { name: /title/i }), "learn");
    });
    // await user.click(screen.getByText(/save/i));

    await act(async () => {
      // await waitFor(async () => {
      await user.click(screen.getByText(/save/i));
    });

    // const f = "f";

    // expect(await screen.findByText(/learn/i)).toBeInTheDocument();
    expect(
      within(sidebar).getByRole("button", { name: /learn/i })
    ).toBeInTheDocument();
    // await waitFor(() => {
    //   expect(
    //     // screen.getByText(/europe trip/i)
    //     screen.getByText("learn")
    //     // within(sidebar).getByRole("button", { name: /europe trip/i })
    //     // within(sidebar).getByText(/learn/i)
    //     // screen.getByText(/learn/i)
    //   ).toBeInTheDocument();
    // });

    // console.log(prettyDOM(sidebar, 10000));
    server.resetHandlers();
    server.close();
  });

  //interactions
  describe("Drag & Drop", () => {
    it("moves event from sidebar to grid after drop", async () => {
      await waitFor(() => {
        render(<CalendarView />, { state: weekEventState });
      });
      expect(
        screen.getByRole("button", { name: /europe trip/i })
      ).toBeInTheDocument();
    });
  });
  it.todo("displays times preview while dragging");
});
