import {
  GooglePeopleAdapter,
  type GooglePeopleApi,
  type GooglePeopleSearchPage,
} from "@sync/providers/google/google-people.adapter";
import { ContactsSearchError } from "@sync/providers/provider-contacts.port";
import { findSafetyCanaryHit } from "@sync/safety/safety-canary";
import { describe, expect, it } from "bun:test";

const page = (
  ...people: Array<{
    emails: Array<{ value: string; primary?: boolean }>;
    name?: string;
  }>
): GooglePeopleSearchPage => ({
  results: people.map((person) => ({
    person: {
      names: person.name === undefined ? [] : [{ displayName: person.name }],
      emailAddresses: person.emails.map(({ value, primary }) => ({
        value,
        metadata: primary === undefined ? null : { primary },
      })),
    },
  })),
});

// Scripted People API: records which surfaces were queried and with what,
// then serves fixed pages (or throws a scripted error).
class FakePeopleApi implements GooglePeopleApi {
  contactsCalls: Array<{ query: string; pageSize: number; readMask: string }> =
    [];
  otherCalls: Array<{ query: string; pageSize: number; readMask: string }> = [];
  contactsPage: GooglePeopleSearchPage = { results: [] };
  otherPage: GooglePeopleSearchPage = { results: [] };
  error?: unknown;

  async searchContacts(params: {
    query: string;
    pageSize: number;
    readMask: string;
  }): Promise<GooglePeopleSearchPage> {
    this.contactsCalls.push(params);
    if (this.error) throw this.error;
    return this.contactsPage;
  }

  async searchOtherContacts(params: {
    query: string;
    pageSize: number;
    readMask: string;
  }): Promise<GooglePeopleSearchPage> {
    this.otherCalls.push(params);
    if (this.error) throw this.error;
    return this.otherPage;
  }
}

const adapterWith = (api: FakePeopleApi) => {
  const tokens: string[] = [];
  const adapter = new GooglePeopleAdapter((accessToken) => {
    tokens.push(accessToken);
    return api;
  });
  return { adapter, tokens };
};

const bothSources = { contacts: true, otherContacts: true };

describe("GooglePeopleAdapter", () => {
  it("queries both surfaces when both scopes were granted and merges the results", async () => {
    const api = new FakePeopleApi();
    api.contactsPage = page({
      emails: [{ value: "alice@example.com" }],
      name: "Alice Doe",
    });
    api.otherPage = page({ emails: [{ value: "albert@example.com" }] });
    const { adapter, tokens } = adapterWith(api);

    const suggestions = await adapter.searchContacts({
      accessToken: "short-lived-token",
      query: "al",
      sources: bothSources,
    });

    expect(tokens).toEqual(["short-lived-token"]);
    expect(api.contactsCalls).toHaveLength(1);
    expect(api.otherCalls).toHaveLength(1);
    // Only the fields the suggestion needs are requested from Google.
    expect(api.contactsCalls[0]).toEqual({
      query: "al",
      pageSize: 10,
      readMask: "names,emailAddresses",
    });
    expect(suggestions).toEqual([
      { email: "alice@example.com", displayName: "Alice Doe" },
      { email: "albert@example.com", displayName: null },
    ]);
  });

  it("queries only the surface the granted scope allows", async () => {
    const api = new FakePeopleApi();
    api.otherPage = page({ emails: [{ value: "other@example.com" }] });
    const { adapter } = adapterWith(api);

    const suggestions = await adapter.searchContacts({
      accessToken: "token",
      query: "ot",
      sources: { contacts: false, otherContacts: true },
    });

    // contacts.readonly was not granted: people.searchContacts is never hit.
    expect(api.contactsCalls).toHaveLength(0);
    expect(api.otherCalls).toHaveLength(1);
    expect(suggestions).toEqual([
      { email: "other@example.com", displayName: null },
    ]);
  });

  it("makes no call at all when no source is allowed", async () => {
    const api = new FakePeopleApi();
    const { adapter, tokens } = adapterWith(api);

    const suggestions = await adapter.searchContacts({
      accessToken: "token",
      query: "al",
      sources: { contacts: false, otherContacts: false },
    });

    expect(suggestions).toEqual([]);
    expect(tokens).toEqual([]);
    expect(api.contactsCalls).toHaveLength(0);
    expect(api.otherCalls).toHaveLength(0);
  });

  it("ranks prefix matches first and de-duplicates by email across surfaces", async () => {
    const api = new FakePeopleApi();
    api.contactsPage = page(
      { emails: [{ value: "zoe@example.com" }], name: "Zoe Alberts" },
      { emails: [{ value: "team@example.com" }], name: "Team" },
      { emails: [{ value: "al@example.com" }], name: "Al" },
    );
    api.otherPage = page(
      // Duplicate of a saved contact (different case): dropped.
      { emails: [{ value: "AL@example.com" }] },
      { emails: [{ value: "alfred@example.com" }] },
    );
    const { adapter } = adapterWith(api);

    const suggestions = await adapter.searchContacts({
      accessToken: "token",
      query: "al",
      sources: bothSources,
    });

    expect(suggestions).toEqual([
      // Prefix matches (email or name) first, saved contacts before other.
      { email: "al@example.com", displayName: "Al" },
      { email: "alfred@example.com", displayName: null },
      // Name "Zoe Alberts" only CONTAINS the query.
      { email: "zoe@example.com", displayName: "Zoe Alberts" },
      // No match text at all ranks last (the provider matched it its own way).
      { email: "team@example.com", displayName: "Team" },
    ]);
  });

  it("prefers the primary email and name, and drops unusable entries", async () => {
    const api = new FakePeopleApi();
    api.contactsPage = {
      results: [
        {
          person: {
            names: [
              { displayName: "Secondary Name" },
              { displayName: "Primary Name", metadata: { primary: true } },
            ],
            emailAddresses: [
              { value: "secondary@example.com" },
              { value: "primary@example.com", metadata: { primary: true } },
              { value: "   " },
            ],
          },
        },
        { person: { names: [], emailAddresses: [] } },
        { person: null },
      ],
    };
    const { adapter } = adapterWith(api);

    const suggestions = await adapter.searchContacts({
      accessToken: "token",
      query: "pr",
      sources: { contacts: true, otherContacts: false },
    });

    expect(suggestions).toEqual([
      { email: "primary@example.com", displayName: "Primary Name" },
      { email: "secondary@example.com", displayName: "Primary Name" },
    ]);
  });

  it("caps the merged list at the contract's maximum", async () => {
    const api = new FakePeopleApi();
    api.contactsPage = page(
      ...Array.from({ length: 9 }, (_, i) => ({
        emails: [{ value: `saved-${i}@example.com` }],
      })),
    );
    api.otherPage = page(
      ...Array.from({ length: 9 }, (_, i) => ({
        emails: [{ value: `other-${i}@example.com` }],
      })),
    );
    const { adapter } = adapterWith(api);

    const suggestions = await adapter.searchContacts({
      accessToken: "token",
      query: "example",
      sources: bothSources,
    });

    expect(suggestions).toHaveLength(10);
  });

  it("maps a 429 to a typed retryable rateLimited error", async () => {
    const api = new FakePeopleApi();
    api.error = Object.assign(new Error("Quota exceeded"), {
      response: { status: 429 },
    });
    const { adapter } = adapterWith(api);

    const promise = adapter.searchContacts({
      accessToken: "token",
      query: "al",
      sources: bothSources,
    });

    await expect(promise).rejects.toBeInstanceOf(ContactsSearchError);
    await expect(promise).rejects.toMatchObject({ reason: "rateLimited" });
  });

  it("maps a 403 quota reason to rateLimited and a plain 403 to unauthorized", async () => {
    const quota = new FakePeopleApi();
    quota.error = Object.assign(new Error("Rate limited"), {
      response: {
        status: 403,
        data: { error: { errors: [{ reason: "rateLimitExceeded" }] } },
      },
    });
    const denied = new FakePeopleApi();
    denied.error = Object.assign(new Error("Insufficient scopes"), {
      response: { status: 403 },
    });

    await expect(
      adapterWith(quota).adapter.searchContacts({
        accessToken: "token",
        query: "al",
        sources: bothSources,
      }),
    ).rejects.toMatchObject({ reason: "rateLimited" });
    await expect(
      adapterWith(denied).adapter.searchContacts({
        accessToken: "token",
        query: "al",
        sources: bothSources,
      }),
    ).rejects.toMatchObject({ reason: "unauthorized" });
  });

  it("never carries contact data or the token in a search error's cause chain", async () => {
    const api = new FakePeopleApi();
    // A gaxios-shaped failure whose request/response carry contact data and
    // the bearer token — none of it may survive into the thrown error.
    api.error = Object.assign(new Error("Internal error"), {
      response: {
        status: 500,
        data: {
          results: [
            {
              person: {
                emailAddresses: [{ value: "leak@example.com" }],
                names: [{ displayName: "Leaky Person" }],
              },
            },
          ],
        },
      },
      config: {
        url: "https://people.googleapis.com/v1/people:searchContacts?query=leak",
        headers: { Authorization: "Bearer secret-token" },
      },
    });
    const { adapter } = adapterWith(api);

    let thrown: unknown;
    try {
      await adapter.searchContacts({
        accessToken: "token",
        query: "leak",
        sources: bothSources,
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ContactsSearchError);
    const error = thrown as ContactsSearchError;
    expect(error.reason).toBe("searchFailed");
    const serialized = {
      message: error.message,
      cause: error.cause instanceof Error ? error.cause.message : error.cause,
      stackedCause: error.cause,
    };
    expect(findSafetyCanaryHit(serialized)).toBeNull();
    expect(JSON.stringify(serialized)).not.toContain("leak@example.com");
    expect(JSON.stringify(serialized)).not.toContain("secret-token");
  });
});
