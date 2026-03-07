import { type PropsWithChildren } from "react";
import type React from "react";
import { createMemoryRouter } from "react-router-dom";
import { type Store } from "redux";
import userEvent from "@testing-library/user-event";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
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

type RenderWithDayProvidersOptions = {
  initialEntries?: string[];
  initialDate?: Dayjs;
  store?: Store;
};

const createDayRouter = (
  component: React.ReactNode,
  opts?: {
    initialEntries?: string[];
    initialDate?: Dayjs;
  },
) => {
  const date =
    opts?.initialDate?.format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT) ??
    loadTodayData().dateString;

  return createMemoryRouter(
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
};

const createUser = () => userEvent.setup({ skipHover: true });

const waitForRouterToInitialize = async (
  router: ReturnType<typeof createMemoryRouter>,
) => {
  if (router.state.initialized && router.state.navigation.state === "idle") {
    return;
  }

  await new Promise<void>((resolve) => {
    const unsubscribe = router.subscribe((state) => {
      if (state.initialized && state.navigation.state === "idle") {
        unsubscribe();
        resolve();
      }
    });
  });
};

export const renderWithDayProviders = (
  component: React.ReactNode,
  opts?: RenderWithDayProvidersOptions,
) => {
  const store = opts?.store ?? defaultStore;
  const router = createDayRouter(component, opts);

  return { user: createUser(), ...render(<></>, { store, router }) };
};

export const renderWithDayProvidersAsync = async (
  component: React.ReactNode,
  opts?: RenderWithDayProvidersOptions,
) => {
  const store = opts?.store ?? defaultStore;
  const router = createDayRouter(component, opts);

  await waitForRouterToInitialize(router);

  return { user: createUser(), ...render(<></>, { store, router }) };
};
