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
  rankContactSuggestions,
  toContactSuggestion,
} from "@sync/providers/provider-contact-suggestions";
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
    return rankContactSuggestions(candidates, input.query).slice(
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

// Graph returns each person's addresses with a relevance score; take them
// most-relevant first so equal-ranking candidates keep Graph's own ordering.
function toSuggestions(person: GraphPersonMatch): ContactSuggestion[] {
  const addresses = [...(person.scoredEmailAddresses ?? [])].sort(
    (a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0),
  );
  return addresses
    .map((entry) => toContactSuggestion(entry.address, person.displayName))
    .filter((suggestion) => suggestion !== null);
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
