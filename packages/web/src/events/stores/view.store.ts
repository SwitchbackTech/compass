import { create } from "zustand";
import { devtools } from "zustand/middleware";
import dayjs from "@core/util/date/dayjs";
import { IS_DEV } from "@web/common/constants/env.constants";

interface ViewState {
  dates: {
    start: string;
    end: string;
  };
  sidebar: {
    isOpen: boolean;
  };
  taskList: {
    isOpen: boolean;
  };
}

export const initialViewState: ViewState = {
  dates: {
    start: dayjs().startOf("week").format(),
    end: dayjs().endOf("week").format(),
  },
  sidebar: { isOpen: true },
  taskList: { isOpen: true },
};

// Selectors passed to this hook must return primitives or stable references;
// a selector that builds a new object/array each call needs `useShallow`.
export const useViewStore = create<ViewState>()(
  devtools(() => initialViewState, {
    name: "compass/view",
    enabled: IS_DEV,
  }),
);

export const viewActions = {
  setSidebarOpen: (isOpen: boolean) =>
    useViewStore.setState({ sidebar: { isOpen } }, false, {
      type: "setSidebarOpen",
    }),
  toggleSidebar: () =>
    useViewStore.setState(
      (state) => ({ sidebar: { isOpen: !state.sidebar.isOpen } }),
      false,
      { type: "toggleSidebar" },
    ),
  setTaskListOpen: (isOpen: boolean) =>
    useViewStore.setState({ taskList: { isOpen } }, false, {
      type: "setTaskListOpen",
    }),
  toggleTaskList: () =>
    useViewStore.setState(
      (state) => ({ taskList: { isOpen: !state.taskList.isOpen } }),
      false,
      { type: "toggleTaskList" },
    ),
  updateDates: (dates: ViewState["dates"]) =>
    useViewStore.setState({ dates }, false, { type: "updateDates" }),
};

export const selectDatesInView = (state: ViewState) => state.dates;
export const selectIsSidebarOpen = (state: ViewState) => state.sidebar.isOpen;
export const selectIsTaskListOpen = (state: ViewState) => state.taskList.isOpen;
