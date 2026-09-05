import { type CaldavFetch } from "@sync/providers/apple/caldav-client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface DiscoveryExchange {
  readonly method: "PROPFIND" | "REPORT" | "PUT" | "DELETE" | "GET";
  readonly depth?: number;
  readonly status: number;
  readonly body: string;
  readonly name?: string;
}

export interface DiscoveryCorpus {
  readonly username?: string;
  readonly exchanges: readonly DiscoveryExchange[];
}

const PARTITION_ID = /\/\d{6,}\//g;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

/** Stable placeholders for founder re-recording before commit. */
export function redactAppleFixtureText(text: string): string {
  return text.replace(PARTITION_ID, "/123456789/").replace(EMAIL, "[email]");
}

export function loadJson<T>(corpusDir: string, name: string): T {
  return JSON.parse(readFileSync(join(corpusDir, `${name}.json`), "utf8")) as T;
}

export function createDiscoveryFetch(corpus: DiscoveryCorpus): CaldavFetch {
  const responses = corpus.exchanges.map((exchange) =>
    xmlResponse(exchange.status, exchange.body),
  );
  let call = 0;
  return (async (...args: Parameters<CaldavFetch>) => {
    void args;
    const response = responses[call];
    call += 1;
    if (!response) throw new Error("unexpected CalDAV discovery request");
    return response;
  }) as unknown as CaldavFetch;
}

export function loadDiscoveryFetch(corpusDir: string): CaldavFetch {
  const corpus = loadJson<DiscoveryCorpus>(corpusDir, "discovery");
  return createDiscoveryFetch(corpus);
}

function xmlResponse(status: number, body: string): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
