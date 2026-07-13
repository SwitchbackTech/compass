import { create } from "zustand";
import { devtools } from "zustand/middleware";
import dayjs from "@core/util/date/dayjs";
import { IS_DEV } from "@web/common/constants/env.constants";
import {
  readSidebarOpen,
  writeSidebarOpen,
} from "@web/common/storage/sidebar-open.storage";

interface ViewState {
  dates: {
    start: string;
    end: string;
  };
  sidebar: {
    isOpen: boolean;
  };
}

export const initialViewState: ViewState = {
  dates: {
    start: dayjs().startOf("week").format(),
    end: dayjs().endOf("week").format(),
  },
  // Seed from the persisted preference so a collapsed sidebar never mounts
  // (and animates closed) on the first render after a refresh.
  sidebar: { isOpen: readSidebarOpen() },
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
      (state) => {
        const isOpen = !state.sidebar.isOpen;
        writeSidebarOpen(isOpen);
        return { sidebar: { isOpen } };
      },
      false,
      { type: "toggleSidebar" },
    ),
  updateDates: (dates: ViewState["dates"]) =>
    useViewStore.setState({ dates }, false, { type: "updateDates" }),
};

export const selectDatesInView = (state: ViewState) => state.dates;
export const selectIsSidebarOpen = (state: ViewState) => state.sidebar.isOpen;
