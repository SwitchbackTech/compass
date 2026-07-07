import { type LoaderFunctionArgs } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import {
  loadDayData,
  loadRootData,
  loadSpecificWeekData,
  loadTodayData,
  loadWeekData,
} from "@web/routers/loaders";

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

describe("loadWeekData", () => {
  it("redirects the bare week route to today's dated week route", async () => {
    const { dateString } = loadTodayData();
    const response = await loadWeekData(
      createLoaderArgs("http://localhost/week"),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      `${ROOT_ROUTES.WEEK}/${dateString}`,
    );
  });

  it("preserves auth query params when redirecting to the dated week route", async () => {
    const { dateString } = loadTodayData();
    const response = await loadWeekData(
      createLoaderArgs("http://localhost/week?auth=login"),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      `${ROOT_ROUTES.WEEK}/${dateString}?auth=login`,
    );
  });
});

describe("loadSpecificWeekData", () => {
  it("returns the parsed date for a valid dateString param", async () => {
    const result = await loadSpecificWeekData({
      request: new Request("http://localhost/week/2026-05-20"),
      params: { dateString: "2026-05-20" },
      context: undefined,
    });

    expect(result).not.toBeInstanceOf(Response);
    expect(result).toMatchObject({ dateString: "2026-05-20" });
  });

  it("redirects to the bare week route for an invalid dateString param", async () => {
    const result = await loadSpecificWeekData({
      request: new Request("http://localhost/week/not-a-date"),
      params: { dateString: "not-a-date" },
      context: undefined,
    });

    expect(result).toBeInstanceOf(Response);
    const response = result as Response;
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(ROOT_ROUTES.WEEK);
  });
});
