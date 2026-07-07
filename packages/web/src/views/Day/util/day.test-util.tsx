import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type PropsWithChildren } from "react";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { render, waitFor } from "@web/__tests__/__mocks__/mock.render";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { loadDateParam, loadTodayData } from "@web/routers/loaders";
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

  const rootRoute = createRootRoute();
  const dayDateRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: ROOT_ROUTES.DAY_DATE,
    loader: loadDateParam,
    component: () => <TaskProviderWrapper>{component}</TaskProviderWrapper>,
  });

  return createRouter({
    routeTree: rootRoute.addChildren([dayDateRoute]),
    history: createMemoryHistory({
      initialEntries: [`${ROOT_ROUTES.DAY}/${date}`],
    }),
    defaultPendingMs: 0,
  });
};

const createUser = () => userEvent.setup({ skipHover: true });

const waitForTaskLoadToSettle = async () => {
  await waitFor(
    () => {
      expect(screen.queryByText("Loading tasks...")).toBeNull();
    },
    { timeout: 5000 },
  );
};

export const renderWithDayProviders = (
  component: React.ReactNode,
  opts?: RenderWithDayProvidersOptions,
) => {
  const router = createDayRouter(component, opts);

  return { user: createUser(), ...render(<div />, { router }) };
};

export const renderWithDayProvidersAsync = async (
  component: React.ReactNode,
  opts?: RenderWithDayProvidersOptions,
) => {
  const router = createDayRouter(component, opts);
  const user = createUser();

  const rtlResult = render(<div />, { router });

  // Poll router + task UI with waitFor (RTL act) instead of await act(async () => …) around
  // router.subscribe, which can trip React 18’s act warning in JSDOM.
  await waitFor(() => {
    expect(router.state.status).toBe("idle");
    expect(router.state.isLoading).toBe(false);
  });

  await waitForTaskLoadToSettle();

  return { user, router, ...rtlResult };
};
