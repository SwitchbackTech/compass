import { type CaptureResult } from "posthog-js";
import { filterPosthogBeforeSend } from "./posthog-exception-filter.util";
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

describe("filterPosthogBeforeSend", () => {
  it("passes through non-exception events", () => {
    const event = {
      uuid: "1",
      event: "$pageview",
      properties: {},
    } as CaptureResult;
    expect(filterPosthogBeforeSend(event)).toBe(event);
  });

  it("drops Chrome Failed to fetch TypeErrors", () => {
    expect(
      filterPosthogBeforeSend(
        exceptionEvent([{ type: "TypeError", value: "Failed to fetch" }]),
      ),
    ).toBeNull();
  });

  it("drops Firefox NetworkError TypeErrors", () => {
    expect(
      filterPosthogBeforeSend(
        exceptionEvent([
          {
            type: "TypeError",
            value: "NetworkError when attempting to fetch resource.",
          },
        ]),
      ),
    ).toBeNull();
  });

  it("drops the exact CefSharp scanner signature", () => {
    expect(
      filterPosthogBeforeSend(
        exceptionEvent([
          {
            type: "Error",
            value:
              "Object Not Found Matching Id:1, MethodName:update, ParamCount:4",
          },
        ]),
      ),
    ).toBeNull();
  });

  it("keeps ApiError exceptions", () => {
    const event = exceptionEvent([
      { type: "ApiError", value: "Request failed with status 500" },
    ]);
    expect(filterPosthogBeforeSend(event)).toBe(event);
  });

  it("keeps other TypeErrors", () => {
    const event = exceptionEvent([
      { type: "TypeError", value: "Cannot read properties of undefined" },
    ]);
    expect(filterPosthogBeforeSend(event)).toBe(event);
  });

  it("reads $exception_types / $exception_values when list is absent", () => {
    expect(
      filterPosthogBeforeSend({
        uuid: "1",
        event: "$exception",
        properties: {
          $exception_types: ["TypeError"],
          $exception_values: ["Failed to fetch"],
        },
      } as CaptureResult),
    ).toBeNull();
  });

  it("keeps mixed exception lists that include a real error", () => {
    const event = exceptionEvent([
      { type: "TypeError", value: "Failed to fetch" },
      { type: "ApiError", value: "Request failed with status 500" },
    ]);
    expect(filterPosthogBeforeSend(event)).toBe(event);
  });
});
