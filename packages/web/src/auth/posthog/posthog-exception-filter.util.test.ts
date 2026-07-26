import { type CaptureResult } from "posthog-js";
import {
  filterPosthogBeforeSend,
  shouldDropPosthogException,
} from "./posthog-exception-filter.util";
import { describe, expect, it } from "bun:test";

const exceptionEvent = (
  entries: Array<{ type?: string; value?: string }>,
): CaptureResult =>
  ({
    uuid: "test-uuid",
    event: "$exception",
    properties: {
      $exception_list: entries,
    },
  }) as CaptureResult;

describe("shouldDropPosthogException", () => {
  it("keeps non-exception events", () => {
    expect(
      shouldDropPosthogException({
        uuid: "1",
        event: "$pageview",
        properties: {},
      }),
    ).toBe(false);
  });

  it("drops Chrome Failed to fetch TypeErrors", () => {
    expect(
      shouldDropPosthogException(
        exceptionEvent([{ type: "TypeError", value: "Failed to fetch" }]),
      ),
    ).toBe(true);
  });

  it("drops Firefox NetworkError TypeErrors", () => {
    expect(
      shouldDropPosthogException(
        exceptionEvent([
          {
            type: "TypeError",
            value: "NetworkError when attempting to fetch resource.",
          },
        ]),
      ),
    ).toBe(true);
  });

  it("drops the exact CefSharp scanner signature", () => {
    expect(
      shouldDropPosthogException(
        exceptionEvent([
          {
            type: "Error",
            value:
              "Object Not Found Matching Id:1, MethodName:update, ParamCount:4",
          },
        ]),
      ),
    ).toBe(true);
  });

  it("keeps ApiError exceptions", () => {
    expect(
      shouldDropPosthogException(
        exceptionEvent([
          { type: "ApiError", value: "Request failed with status 500" },
        ]),
      ),
    ).toBe(false);
  });

  it("keeps other TypeErrors", () => {
    expect(
      shouldDropPosthogException(
        exceptionEvent([
          { type: "TypeError", value: "Cannot read properties of undefined" },
        ]),
      ),
    ).toBe(false);
  });

  it("reads $exception_types / $exception_values when list is absent", () => {
    expect(
      shouldDropPosthogException({
        uuid: "1",
        event: "$exception",
        properties: {
          $exception_types: ["TypeError"],
          $exception_values: ["Failed to fetch"],
        },
      } as CaptureResult),
    ).toBe(true);
  });
});

describe("filterPosthogBeforeSend", () => {
  it("returns null for dropped exceptions", () => {
    expect(
      filterPosthogBeforeSend(
        exceptionEvent([{ type: "TypeError", value: "Failed to fetch" }]),
      ),
    ).toBeNull();
  });

  it("passes through kept events", () => {
    const event = exceptionEvent([
      { type: "ApiError", value: "Request failed with status 500" },
    ]);
    expect(filterPosthogBeforeSend(event)).toBe(event);
  });
});
