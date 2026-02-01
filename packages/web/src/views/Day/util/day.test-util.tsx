import React, { PropsWithChildren } from "react";
import { createMemoryRouter } from "react-router-dom";
import { Store } from "redux";
import userEvent from "@testing-library/user-event";
import dayjs, { Dayjs } from "@core/util/date/dayjs";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { loadSpecificDayData, loadTodayData } from "@web/routers/loaders";
import { store as defaultStore } from "@web/store";
import { DateNavigationProvider } from "@web/views/Day/context/DateNavigationContext";
import { TaskProvider } from "@web/views/Day/context/TaskContext";

export const TaskProviderWrapper = ({ children }: PropsWithChildren) => {
  return (
    <DateNavigationProvider>
      <TaskProvider>{children}</TaskProvider>
    </DateNavigationProvider>
  );
};

export const renderWithDayProviders = (
  component: React.ReactNode,
  opts?: {
    initialEntries?: string[];
    initialDate?: Dayjs;
    store?: Store;
  },
) => {
  const date =
    opts?.initialDate?.format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT) ??
    loadTodayData().dateString;

  const store = opts?.store ?? defaultStore;
  const router = createMemoryRouter(
    [
      {
        path: ROOT_ROUTES.DAY_DATE,
        id: ROOT_ROUTES.DAY_DATE,
        loader: loadSpecificDayData,
        element: <TaskProviderWrapper>{component}</TaskProviderWrapper>,
      },
    ],
    {
      future: { v7_relativeSplatPath: true },
      initialEntries: [`${ROOT_ROUTES.DAY}/${date}`],
    },
  );

  return { user: userEvent.setup(), ...render(<></>, { store, router }) };
};
