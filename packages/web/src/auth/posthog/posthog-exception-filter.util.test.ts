import { filterPosthogExceptionEvent } from "./posthog-exception-filter.util";

describe("filterPosthogExceptionEvent", () => {
  it("drops known Object Not Found update signature exceptions", () => {
    const filteredEvent = filterPosthogExceptionEvent({
      event: "$exception",
      properties: {
        $exception_values: [
          "Non-Error promise rejection captured with value: Object Not Found Matching Id:1, MethodName:update, ParamCount:4",
        ],
      },
    });

    expect(filteredEvent).toBeNull();
  });

  it("keeps other exception events", () => {
    const event = {
      event: "$exception",
      properties: {
        $exception_values: ["TypeError: Cannot read properties of undefined"],
      },
    };

    const filteredEvent = filterPosthogExceptionEvent(event);

    expect(filteredEvent).toEqual(event);
  });

  it("keeps non-exception events", () => {
    const event = {
      event: "$pageview",
      properties: {
        $current_url: "/onboarding",
      },
    };

    const filteredEvent = filterPosthogExceptionEvent(event);

    expect(filteredEvent).toEqual(event);
  });
});
