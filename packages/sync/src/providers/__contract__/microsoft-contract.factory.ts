import {
  type GraphEventDeltaItem,
  type MicrosoftEventListApi,
  type MicrosoftEventListPage,
  MicrosoftEventReaderAdapter,
} from "@sync/providers/microsoft/microsoft-event-reader.adapter";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CONTRACT_ROOT = dirname(fileURLToPath(import.meta.url));

interface ReaderCorpusPage {
  readonly items: readonly GraphEventDeltaItem[];
  readonly nextLink?: string | null;
  readonly deltaLink?: string | null;
}

export interface MicrosoftReaderCorpus {
  readonly page1: ReaderCorpusPage;
  readonly page2: ReaderCorpusPage;
  readonly expiredDeltaLink: string;
  readonly masterCategories: Record<string, string>;
}

class CorpusEventListApi implements MicrosoftEventListApi {
  constructor(private readonly corpus: MicrosoftReaderCorpus) {}

  async listPage(
    params: Parameters<MicrosoftEventListApi["listPage"]>[0],
  ): Promise<MicrosoftEventListPage> {
    if (params.deltaLink === this.corpus.expiredDeltaLink) {
      throw httpError(410);
    }
    if (params.pageLink) {
      return normalizePage(this.corpus.page2);
    }
    return normalizePage(this.corpus.page1);
  }
}

function normalizePage(page: ReaderCorpusPage): MicrosoftEventListPage {
  return {
    items: page.items,
    nextLink: page.nextLink ?? null,
    deltaLink: page.deltaLink ?? null,
  };
}

function httpError(status: number, body?: unknown): Error {
  return Object.assign(new Error(`microsoft error ${status}`), {
    response: { status, data: body },
  });
}

function loadJson<T>(corpusDir: string, name: string): T {
  return JSON.parse(readFileSync(join(corpusDir, `${name}.json`), "utf8")) as T;
}

/** Replay `fixtures/microsoft/reader.json` through the event reader adapter. */
export function microsoftRecordedReader(
  corpusDir: string,
): MicrosoftEventReaderAdapter {
  const reader = loadJson<MicrosoftReaderCorpus>(corpusDir, "reader");
  return new MicrosoftEventReaderAdapter(() => new CorpusEventListApi(reader), {
    warn: () => {},
  });
}

export function defaultMicrosoftReaderCorpus(): MicrosoftReaderCorpus {
  return loadJson<MicrosoftReaderCorpus>(
    join(CONTRACT_ROOT, "fixtures", "microsoft"),
    "reader",
  );
}

export function microsoftReaderMasterCategories(): Map<string, string> {
  return new Map(
    Object.entries(defaultMicrosoftReaderCorpus().masterCategories),
  );
}
