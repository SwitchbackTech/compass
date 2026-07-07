import { isRedirect } from "@tanstack/react-router";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import {
  loadDayData,
  loadRootData,
  loadSpecificWeekData,
  loadTodayData,
  loadWeekData,
} from "@web/routers/loaders";
import { describe, expect, it } from "bun:test";

function getRedirect(fn: () => unknown) {
  try {
    fn();
  } catch (err) {
    if (!isRedirect(err)) throw err;
    return err;
  }
  throw new Error("expected a redirect to be thrown");
}

describe("loadRootData", () => {
  it("redirects root route to day route with today's date", () => {
    const { dateString } = loadTodayData();
    const redirect = getRedirect(loadRootData);

    expect(redirect.options.to).toBe(ROOT_ROUTES.DAY_DATE);
    expect(
      redirect.options.params as unknown as Record<string, string>,
    ).toEqual({
      dateString,
    });
  });

  it("preserves auth query params when redirecting to today's date", () => {
    const redirect = getRedirect(loadRootData);
    const search = redirect.options.search as (
      prev: Record<string, unknown>,
    ) => Record<string, unknown>;

    expect(search({ auth: "login" })).toEqual({ auth: "login" });
  });
});

describe("loadDayData", () => {
  it("redirects the bare day route to today's dated day route", () => {
    const { dateString } = loadTodayData();
    const redirect = getRedirect(loadDayData);

    expect(redirect.options.to).toBe(ROOT_ROUTES.DAY_DATE);
    expect(
      redirect.options.params as unknown as Record<string, string>,
    ).toEqual({
      dateString,
    });
  });

  it("preserves auth query params when redirecting to the dated route", () => {
    const redirect = getRedirect(loadDayData);
    const search = redirect.options.search as (
      prev: Record<string, unknown>,
    ) => Record<string, unknown>;

    expect(search({ auth: "reset", token: "abc" })).toEqual({
      auth: "reset",
      token: "abc",
    });
  });
});

describe("loadWeekData", () => {
  it("redirects the bare week route to today's dated week route", () => {
    const { dateString } = loadTodayData();
    const redirect = getRedirect(loadWeekData);

    expect(redirect.options.to).toBe(ROOT_ROUTES.WEEK_DATE);
    expect(
      redirect.options.params as unknown as Record<string, string>,
    ).toEqual({
      dateString,
    });
  });

  it("preserves auth query params when redirecting to the dated week route", () => {
    const redirect = getRedirect(loadWeekData);
    const search = redirect.options.search as (
      prev: Record<string, unknown>,
    ) => Record<string, unknown>;

    expect(search({ auth: "login" })).toEqual({ auth: "login" });
  });
});

describe("loadSpecificWeekData", () => {
  it("returns the parsed date for a valid dateString param", () => {
    const result = loadSpecificWeekData({
      params: { dateString: "2026-05-20" },
    });

    expect(result).toMatchObject({ dateString: "2026-05-20" });
  });

  it("redirects to the bare week route for an invalid dateString param", () => {
    const redirect = getRedirect(() =>
      loadSpecificWeekData({ params: { dateString: "not-a-date" } }),
    );

    expect(redirect.options.to).toBe(ROOT_ROUTES.WEEK);
  });
});
