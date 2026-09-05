import {
  CONTACT_SUGGESTION_MAX_RESULTS,
  type ContactSuggestion,
} from "@core/types/contact.contracts";
import {
  microsoftFailureCause,
  microsoftStatus,
} from "@sync/providers/microsoft/microsoft-error";
import {
  MICROSOFT_GRAPH_BASE_URL,
  MICROSOFT_REQUEST_TIMEOUT_MS,
} from "@sync/providers/microsoft/microsoft-http.constants";
import {
  type ContactsPort,
  ContactsSearchError,
  type ContactsSearchInput,
} from "@sync/providers/provider-contacts.port";

export interface GraphScoredEmailAddress {
  readonly address?: string | null;
  readonly relevanceScore?: number | null;
}

export interface GraphPersonMatch {
  readonly displayName?: string | null;
  readonly scoredEmailAddresses?: readonly GraphScoredEmailAddress[] | null;
}

export interface MicrosoftPeopleSearchPage {
  readonly value: readonly GraphPersonMatch[];
}

export interface MicrosoftPeopleApi {
  searchPeople(params: {
    query: string;
    top: number;
    select: string;
  }): Promise<MicrosoftPeopleSearchPage>;
}

export type MicrosoftPeopleApiFactory = (
  accessToken: string,
) => MicrosoftPeopleApi;

const PEOPLE_SELECT = "displayName,scoredEmailAddresses";

const defaultApiFactory: MicrosoftPeopleApiFactory = (accessToken) =>
  new FetchMicrosoftPeopleApi(accessToken);

export class MicrosoftPeopleAdapter implements ContactsPort {
  #makeApi: MicrosoftPeopleApiFactory;

  constructor(makeApi: MicrosoftPeopleApiFactory = defaultApiFactory) {
    this.#makeApi = makeApi;
  }

  async searchContacts(
    input: ContactsSearchInput,
  ): Promise<ContactSuggestion[]> {
    if (!input.sources.contacts) return [];

    const api = this.#makeApi(input.accessToken);
    let page: MicrosoftPeopleSearchPage;
    try {
      page = await api.searchPeople({
        query: input.query,
        top: CONTACT_SUGGESTION_MAX_RESULTS,
        select: PEOPLE_SELECT,
      });
    } catch (error) {
      throw toContactsSearchError(error);
    }

    const candidates = page.value.flatMap((person) => toSuggestions(person));
    return rankSuggestions(candidates, input.query).slice(
      0,
      CONTACT_SUGGESTION_MAX_RESULTS,
    );
  }
}

class FetchMicrosoftPeopleApi implements MicrosoftPeopleApi {
  #accessToken: string;

  constructor(accessToken: string) {
    this.#accessToken = accessToken;
  }

  async searchPeople(params: {
    query: string;
    top: number;
    select: string;
  }): Promise<MicrosoftPeopleSearchPage> {
    const query = new URLSearchParams({
      $search: `"${params.query}"`,
      $select: params.select,
      $top: String(params.top),
    });
    const response = await fetch(
      `${MICROSOFT_GRAPH_BASE_URL}/me/people?${query}`,
      {
        headers: {
          Authorization: `Bearer ${this.#accessToken}`,
          ConsistencyLevel: "eventual",
        },
        signal: AbortSignal.timeout(MICROSOFT_REQUEST_TIMEOUT_MS),
      },
    );

    const data = (await response.json()) as {
      value?: GraphPersonMatch[];
      error?: { code?: string; message?: string };
    };

    if (!response.ok) {
      throw Object.assign(
        new Error(data.error?.message ?? "microsoft_people_search_failed"),
        { response: { status: response.status, data } },
      );
    }

    return { value: data.value ?? [] };
  }
}

function toSuggestions(person: GraphPersonMatch): ContactSuggestion[] {
  const rawName = (person.displayName ?? "").trim();
  const displayName =
    rawName.length > 0 && rawName.length <= 256 ? rawName : null;

  const addresses = [...(person.scoredEmailAddresses ?? [])].sort(
    (a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0),
  );
  const suggestions: ContactSuggestion[] = [];
  for (const entry of addresses) {
    const email = (entry.address ?? "").trim();
    if (email.length === 0 || email.length > 320) continue;
    suggestions.push({ email, displayName });
  }
  return suggestions;
}

function rankSuggestions(
  candidates: readonly ContactSuggestion[],
  query: string,
): ContactSuggestion[] {
  const needle = query.trim().toLowerCase();
  const rank = (suggestion: ContactSuggestion): number => {
    const email = suggestion.email.toLowerCase();
    const name = suggestion.displayName?.toLowerCase() ?? "";
    if (email.startsWith(needle) || name.startsWith(needle)) return 0;
    if (email.includes(needle) || name.includes(needle)) return 1;
    return 2;
  };

  const ranked = candidates
    .map((suggestion, index) => ({ suggestion, index, rank: rank(suggestion) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index);

  const seen = new Set<string>();
  const unique: ContactSuggestion[] = [];
  for (const { suggestion } of ranked) {
    const key = suggestion.email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(suggestion);
  }
  return unique;
}

function toContactsSearchError(error: unknown): ContactsSearchError {
  const status = microsoftStatus(error);
  if (status === 429) {
    return new ContactsSearchError(
      "rateLimited",
      "Microsoft throttled the contact search",
      { cause: microsoftFailureCause(error) },
    );
  }
  if (status === 401 || status === 403) {
    return new ContactsSearchError(
      "unauthorized",
      "Microsoft refused the contact search credential or scope",
      { cause: microsoftFailureCause(error) },
    );
  }
  return new ContactsSearchError("searchFailed", "Contact search failed", {
    cause: microsoftFailureCause(error),
  });
}
