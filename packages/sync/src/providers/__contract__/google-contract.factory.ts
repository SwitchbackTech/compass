import { type calendar_v3 } from "@googleapis/calendar";
import { type Credentials, type TokenPayload } from "google-auth-library";
import { type gSchema$Event } from "@core/types/gcal";
import {
  GoogleAuthAdapter,
  type GoogleOAuthClient,
} from "@sync/providers/google/google-auth.adapter";
import {
  GoogleCalendarAdapter,
  type GoogleCalendarListApi,
  type GoogleCalendarListPage,
  type GoogleEventLabel,
} from "@sync/providers/google/google-calendar.adapter";
import {
  type GoogleEventListApi,
  type GoogleEventListPage,
  GoogleEventReaderAdapter,
} from "@sync/providers/google/google-event-reader.adapter";
import {
  type GoogleEventsApi,
  GoogleEventWriter,
} from "@sync/providers/google/google-event-writer.adapter";
import {
  type GoogleChannelsApi,
  GoogleNotificationAdapter,
} from "@sync/providers/google/google-notifications.adapter";
import { type ProviderAdapters } from "@sync/providers/provider-adapters";
import { readFileSync } from "node:fs";
import { join } from "node:path";

interface AuthCorpus {
  readonly exchange: {
    readonly tokens: Credentials;
    readonly payload: TokenPayload;
  };
  readonly refresh: Credentials;
  readonly revokedRefreshToken: string;
}

interface DiscoveryCorpus {
  readonly pages: GoogleCalendarListPage[];
  readonly labelsById?: Record<string, readonly GoogleEventLabel[]>;
}

interface ReaderCorpus {
  readonly page1: GoogleEventListPage;
  readonly page2: GoogleEventListPage;
  readonly expiredCursor: string;
}

interface WriterCorpus {
  readonly insert: gSchema$Event;
  readonly instance: gSchema$Event;
}

interface NotificationsCorpus {
  readonly watch: calendar_v3.Schema$Channel;
}

function loadJson<T>(corpusDir: string, name: string): T {
  return JSON.parse(readFileSync(join(corpusDir, `${name}.json`), "utf8")) as T;
}

function httpError(status: number, body?: unknown): Error {
  return Object.assign(new Error(`google error ${status}`), {
    response: { status, data: body },
  });
}

class CorpusCalendarListApi implements GoogleCalendarListApi {
  constructor(private readonly corpus: DiscoveryCorpus) {}

  async listPage(): Promise<GoogleCalendarListPage> {
    const page = this.corpus.pages[0];
    if (!page) throw new Error("discovery corpus has no pages");
    return page;
  }

  async getEventLabels(
    calendarId: string,
  ): Promise<readonly GoogleEventLabel[]> {
    return this.corpus.labelsById?.[calendarId] ?? [];
  }
}

class CorpusEventListApi implements GoogleEventListApi {
  constructor(private readonly corpus: ReaderCorpus) {}

  async listPage(
    params: Parameters<GoogleEventListApi["listPage"]>[0],
  ): Promise<GoogleEventListPage> {
    if (params.syncToken === this.corpus.expiredCursor) {
      throw httpError(410);
    }
    if (params.pageToken) return this.corpus.page2;
    return this.corpus.page1;
  }
}

class CorpusEventsApi implements GoogleEventsApi {
  #deleted = new Set<string>();
  #etag: string;

  constructor(private readonly corpus: WriterCorpus) {
    this.#etag = corpus.insert.etag ?? '"v1"';
  }

  async insert(
    params: Parameters<GoogleEventsApi["insert"]>[0],
  ): Promise<gSchema$Event> {
    return {
      ...this.corpus.insert,
      id: params.requestBody.id as string,
      etag: this.#etag,
    };
  }

  async patch(
    params: Parameters<GoogleEventsApi["patch"]>[0],
  ): Promise<gSchema$Event> {
    if (params.ifMatch && params.ifMatch !== this.#etag) {
      throw httpError(412);
    }
    this.#etag = '"v2"';
    return {
      ...this.corpus.insert,
      id: params.eventId,
      etag: this.#etag,
    };
  }

  async delete(
    params: Parameters<GoogleEventsApi["delete"]>[0],
  ): Promise<void> {
    if (this.#deleted.has(params.eventId)) throw httpError(404);
    this.#deleted.add(params.eventId);
  }

  async get(
    params: Parameters<GoogleEventsApi["get"]>[0],
  ): Promise<gSchema$Event> {
    return { ...this.corpus.insert, id: params.eventId, etag: this.#etag };
  }

  async instances(
    params: Parameters<GoogleEventsApi["instances"]>[0],
  ): Promise<{ items?: gSchema$Event[] }> {
    return {
      items: [
        {
          ...this.corpus.instance,
          recurringEventId: params.eventId,
          originalStartTime: { dateTime: params.originalStart },
        },
      ],
    };
  }
}

class CorpusChannelsApi implements GoogleChannelsApi {
  constructor(private readonly corpus: NotificationsCorpus) {}

  async watchEvents(): Promise<calendar_v3.Schema$Channel> {
    return this.corpus.watch;
  }

  async watchCalendarList(): Promise<calendar_v3.Schema$Channel> {
    return this.corpus.watch;
  }

  async stopChannel(): Promise<void> {}
}

/**
 * Build Google adapters that replay `fixtures/google/*.json`. Synthesized
 * from the existing Google adapter tests; no live account is required.
 */
export function googleRecordedFactory(corpusDir: string): ProviderAdapters {
  const auth = loadJson<AuthCorpus>(corpusDir, "auth");
  const discovery = loadJson<DiscoveryCorpus>(corpusDir, "discovery");
  const reader = loadJson<ReaderCorpus>(corpusDir, "reader");
  const writer = loadJson<WriterCorpus>(corpusDir, "writer");
  const notifications = loadJson<NotificationsCorpus>(
    corpusDir,
    "notifications",
  );

  return {
    auth: new GoogleAuthAdapter(
      "client-id.apps.googleusercontent.com",
      "client-secret",
      (redirectUri) => {
        // Refresh/revoke pass no redirect URI; the revoked-token case uses a
        // dedicated client so a live-looking refresh of the good token still works.
        void redirectUri;
        return new TokenAwareClient(auth);
      },
    ),
    calendars: new GoogleCalendarAdapter(
      () => new CorpusCalendarListApi(discovery),
    ),
    reader: new GoogleEventReaderAdapter(() => new CorpusEventListApi(reader), {
      warn: () => {},
    }),
    writer: new GoogleEventWriter(() => new CorpusEventsApi(writer)),
    notifications: new GoogleNotificationAdapter(
      () => new CorpusChannelsApi(notifications),
      () => new Date("2026-01-01T00:00:00Z"),
    ),
  };
}

class TokenAwareClient implements GoogleOAuthClient {
  #refreshToken: string | null = null;

  constructor(private readonly corpus: AuthCorpus) {}

  generateAuthUrl(): string {
    return "https://accounts.google.com/o/oauth2/v2/auth";
  }

  async getToken(_code: string): Promise<{ tokens: Credentials }> {
    return { tokens: this.corpus.exchange.tokens };
  }

  async verifyIdToken(): Promise<{ getPayload(): TokenPayload | undefined }> {
    return { getPayload: () => this.corpus.exchange.payload };
  }

  setCredentials(credentials: { refresh_token: string }): void {
    this.#refreshToken = credentials.refresh_token;
  }

  async refreshAccessToken(): Promise<{ credentials: Credentials }> {
    if (this.#refreshToken === this.corpus.revokedRefreshToken) {
      throw httpError(400, { error: "invalid_grant" });
    }
    return { credentials: this.corpus.refresh };
  }

  async revokeToken(_token: string): Promise<unknown> {
    return {};
  }
}

export function googleLiveFactory(_corpusDir: string): ProviderAdapters {
  const clientId =
    process.env["SMOKE_GOOGLE_CLIENT_ID"] ??
    process.env["GOOGLE_CLIENT_ID"] ??
    "";
  const clientSecret =
    process.env["SMOKE_GOOGLE_CLIENT_SECRET"] ??
    process.env["GOOGLE_CLIENT_SECRET"] ??
    "";
  return {
    auth: new GoogleAuthAdapter(clientId, clientSecret),
    calendars: new GoogleCalendarAdapter(),
    reader: new GoogleEventReaderAdapter(),
    writer: new GoogleEventWriter(),
    notifications: new GoogleNotificationAdapter(),
  };
}

export function hasGoogleLiveCredentials(): boolean {
  const clientId =
    process.env["SMOKE_GOOGLE_CLIENT_ID"] ?? process.env["GOOGLE_CLIENT_ID"];
  const clientSecret =
    process.env["SMOKE_GOOGLE_CLIENT_SECRET"] ??
    process.env["GOOGLE_CLIENT_SECRET"];
  return Boolean(
    clientId && clientSecret && process.env["SMOKE_GOOGLE_REFRESH_TOKEN"],
  );
}
