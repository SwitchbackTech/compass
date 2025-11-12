import React from "react";
import { Provider as ReduxProvider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import dayjs, { Dayjs } from "@core/util/date/dayjs";
import { setup } from "@web/__tests__/utils/tasks/task.test.util";
import { store as defaultStore } from "@web/store";
import { DateNavigationProvider } from "../context/DateNavigationProvider";
import { TaskProvider } from "../context/TaskProvider";

export const renderWithDayProviders = (
  component: React.ReactNode,
  opts?: {
    initialEntries?: string[];
    initialDate?: Dayjs;
    store?: typeof defaultStore;
  },
) => {
  const store = opts?.store ?? defaultStore;

  return setup(
    <ReduxProvider store={store}>
      <MemoryRouter
        initialEntries={opts?.initialEntries}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <DateNavigationProvider
          initialDate={opts?.initialDate ?? dayjs().utc()}
        >
          <TaskProvider>{component}</TaskProvider>
        </DateNavigationProvider>
      </MemoryRouter>
    </ReduxProvider>,
  );
};

export const TaskProviderWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <MemoryRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <DateNavigationProvider initialDate={dayjs().utc()}>
        <TaskProvider>{children}</TaskProvider>
      </DateNavigationProvider>
    </MemoryRouter>
  );
};
