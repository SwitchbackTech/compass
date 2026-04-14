import { ROOT_ROUTES } from "@web/common/constants/routes";
import { loadDayData, loadRootData, loadTodayData } from "@web/routers/loaders";
import { type LoaderFunctionArgs } from "react-router-dom";

function createLoaderArgs(url: string): LoaderFunctionArgs<unknown> {
  return {
    request: new Request(url),
    params: {},
    context: undefined,
  };
}

describe("loadRootData", () => {
  it("redirects root route to day route with today's date", async () => {
    const { dateString } = loadTodayData();
    const response = await loadRootData(createLoaderArgs("http://localhost/"));

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      `${ROOT_ROUTES.DAY}/${dateString}`,
    );
  });

  it("preserves auth query params when redirecting to today's date", async () => {
    const { dateString } = loadTodayData();
    const response = await loadRootData(
      createLoaderArgs("http://localhost/?auth=login"),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      `${ROOT_ROUTES.DAY}/${dateString}?auth=login`,
    );
  });
});

describe("loadDayData", () => {
  it("preserves auth query params when redirecting to the dated route", async () => {
    const { dateString } = loadTodayData();
    const response = await loadDayData(
      createLoaderArgs("http://localhost/day?auth=reset&token=abc"),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      `${ROOT_ROUTES.DAY}/${dateString}?auth=reset&token=abc`,
    );
  });

  it("preserves verify auth query params when redirecting to the dated route", async () => {
    const { dateString } = loadTodayData();
    const response = await loadDayData(
      createLoaderArgs("http://localhost/day?auth=verify&token=abc"),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      `${ROOT_ROUTES.DAY}/${dateString}?auth=verify&token=abc`,
    );
  });
});
