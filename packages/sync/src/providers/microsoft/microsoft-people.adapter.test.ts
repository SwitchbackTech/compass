import {
  MicrosoftPeopleAdapter,
  type MicrosoftPeopleApi,
  type MicrosoftPeopleSearchPage,
} from "@sync/providers/microsoft/microsoft-people.adapter";
import { ContactsSearchError } from "@sync/providers/provider-contacts.port";
import { describe, expect, it } from "bun:test";

const page = (
  ...people: Array<{
    emails: Array<{ address: string; relevanceScore?: number }>;
    name?: string;
  }>
): MicrosoftPeopleSearchPage => ({
  value: people.map((person) => ({
    displayName: person.name ?? null,
    scoredEmailAddresses: person.emails.map(({ address, relevanceScore }) => ({
      address,
      relevanceScore: relevanceScore ?? null,
    })),
  })),
});

class FakePeopleApi implements MicrosoftPeopleApi {
  calls: Array<{ query: string; top: number; select: string }> = [];
  result: MicrosoftPeopleSearchPage = { value: [] };
  error?: unknown;

  async searchPeople(params: {
    query: string;
    top: number;
    select: string;
  }): Promise<MicrosoftPeopleSearchPage> {
    this.calls.push(params);
    if (this.error) throw this.error;
    return this.result;
  }
}

const adapterWith = (api: FakePeopleApi) => {
  const tokens: string[] = [];
  const adapter = new MicrosoftPeopleAdapter((accessToken) => {
    tokens.push(accessToken);
    return api;
  });
  return { adapter, tokens };
};

describe("MicrosoftPeopleAdapter", () => {
  it("returns ranked suggestions from a Graph people search hit", async () => {
    const api = new FakePeopleApi();
    api.result = page(
      {
        emails: [{ address: "alice@example.com", relevanceScore: 10 }],
        name: "Alice Doe",
      },
      { emails: [{ address: "alfred@example.com", relevanceScore: 5 }] },
    );
    const { adapter, tokens } = adapterWith(api);

    const suggestions = await adapter.searchContacts({
      accessToken: "short-lived-token",
      query: "al",
      sources: { contacts: true, otherContacts: false },
    });

    expect(tokens).toEqual(["short-lived-token"]);
    expect(api.calls).toEqual([
      {
        query: "al",
        top: 10,
        select: "displayName,scoredEmailAddresses",
      },
    ]);
    expect(suggestions).toEqual([
      { email: "alice@example.com", displayName: "Alice Doe" },
      { email: "alfred@example.com", displayName: null },
    ]);
  });

  it("returns an empty list when Graph returns no people", async () => {
    const api = new FakePeopleApi();
    api.result = { value: [] };
    const { adapter } = adapterWith(api);

    const suggestions = await adapter.searchContacts({
      accessToken: "token",
      query: "zz",
      sources: { contacts: true, otherContacts: false },
    });

    expect(suggestions).toEqual([]);
    expect(api.calls).toHaveLength(1);
  });

  it("makes no call when the contacts source is not allowed", async () => {
    const api = new FakePeopleApi();
    const { adapter, tokens } = adapterWith(api);

    const suggestions = await adapter.searchContacts({
      accessToken: "token",
      query: "al",
      sources: { contacts: false, otherContacts: false },
    });

    expect(suggestions).toEqual([]);
    expect(tokens).toEqual([]);
    expect(api.calls).toHaveLength(0);
  });

  it("maps a 401 to an unauthorized ContactsSearchError", async () => {
    const api = new FakePeopleApi();
    api.error = Object.assign(new Error("Unauthorized"), {
      response: { status: 401 },
    });
    const { adapter } = adapterWith(api);

    const promise = adapter.searchContacts({
      accessToken: "token",
      query: "al",
      sources: { contacts: true, otherContacts: false },
    });

    await expect(promise).rejects.toBeInstanceOf(ContactsSearchError);
    await expect(promise).rejects.toMatchObject({ reason: "unauthorized" });
  });

  it("maps a 429 to a typed retryable rateLimited error", async () => {
    const api = new FakePeopleApi();
    api.error = Object.assign(new Error("Too many requests"), {
      response: { status: 429 },
    });
    const { adapter } = adapterWith(api);

    const promise = adapter.searchContacts({
      accessToken: "token",
      query: "al",
      sources: { contacts: true, otherContacts: false },
    });

    await expect(promise).rejects.toBeInstanceOf(ContactsSearchError);
    await expect(promise).rejects.toMatchObject({ reason: "rateLimited" });
  });
});
