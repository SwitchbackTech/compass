import { ContactsSearchError } from "@sync/providers/provider-contacts.port";
import {
  classifyContactsSearchError,
  type ProviderContactsErrorPolicy,
} from "@sync/providers/provider-contacts-error";
import { describe, expect, it } from "bun:test";

const policy: ProviderContactsErrorPolicy = {
  status: (error) => (error as { status?: number })?.status,
  cause: (error) =>
    new Error(`cause:${(error as { status?: number })?.status}`),
  isRateLimited: (_error, status) => status === 429,
  rateLimitedMessage: "Testly throttled the contact search",
  unauthorizedMessage: "Testly refused the contact search credential or scope",
};

const classify = (status?: number): ContactsSearchError =>
  classifyContactsSearchError(status === undefined ? {} : { status }, policy);

describe("classifyContactsSearchError", () => {
  it("maps a rate-limited call, named by the policy", () => {
    const error = classify(429);
    expect(error.reason).toBe("rateLimited");
    expect(error.message).toBe("Testly throttled the contact search");
  });

  it("maps 401 and 403 to unauthorized, named by the policy", () => {
    for (const status of [401, 403]) {
      const error = classify(status);
      expect(error.reason).toBe("unauthorized");
      expect(error.message).toBe(
        "Testly refused the contact search credential or scope",
      );
    }
  });

  it("maps every other status, including a missing one, to searchFailed", () => {
    for (const status of [undefined, 400, 404, 500]) {
      const error = classify(status);
      expect(error.reason).toBe("searchFailed");
      expect(error.message).toBe("Contact search failed");
    }
  });

  it("honors a provider-specific rate-limit predicate beyond 429", () => {
    const error = classifyContactsSearchError(
      { status: 403, quota: true },
      {
        ...policy,
        isRateLimited: (err, status) =>
          status === 429 || (err as { quota?: boolean }).quota === true,
      },
    );
    expect(error.reason).toBe("rateLimited");
  });

  it("carries the policy's cause through", () => {
    expect(classify(400).cause).toEqual(new Error("cause:400"));
  });

  it("returns a ContactsSearchError so instanceof narrowing still works", () => {
    expect(classify(401)).toBeInstanceOf(ContactsSearchError);
    expect(classify(401).name).toBe("ContactsSearchError");
  });
});
