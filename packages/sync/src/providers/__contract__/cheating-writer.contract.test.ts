import {
  assertWriterRejectsStaleVersion,
  CONTRACT_CONTENT,
  CONTRACT_EVENT_ID,
  CONTRACT_SCHEDULE,
} from "@sync/providers/__contract__/adapter-contract";
import { googleRecordedFactory } from "@sync/providers/__contract__/google-contract.factory";
import { type ProviderEventRead } from "@sync/providers/provider-event.port";
import {
  type ProviderCreateInput,
  type ProviderDeleteInput,
  type ProviderEventWriter,
  type ProviderFetchInput,
  type ProviderInstanceFetchInput,
  type ProviderPatchInput,
  type ProviderWriteResult,
} from "@sync/providers/provider-event-writer.port";
import { describe, expect, it } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const corpusDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "google",
);

class CheatingWriter implements ProviderEventWriter {
  async createEvent(input: ProviderCreateInput): Promise<ProviderWriteResult> {
    return {
      providerEventId: input.providerEventId,
      providerVersion: '"v1"',
    };
  }

  async patchEvent(input: ProviderPatchInput): Promise<ProviderWriteResult> {
    return {
      providerEventId: input.providerEventId,
      providerVersion: '"v2"',
    };
  }

  async deleteEvent(_input: ProviderDeleteInput): Promise<void> {}

  async fetchEvent(
    _input: ProviderFetchInput,
  ): Promise<ProviderEventRead | null> {
    return null;
  }

  async fetchInstanceAt(
    _input: ProviderInstanceFetchInput,
  ): Promise<ProviderEventRead | null> {
    return null;
  }
}

describe("adapter contract writer canary", () => {
  it("fails when a fake writer returns success for a stale version", async () => {
    await expect(
      assertWriterRejectsStaleVersion(new CheatingWriter()),
    ).rejects.toThrow(/stale expectedVersion/);
  });

  it("passes for the recorded Google writer", async () => {
    await assertWriterRejectsStaleVersion(
      googleRecordedFactory(corpusDir).writer,
    );
    expect(CONTRACT_EVENT_ID).toBeTruthy();
    expect(CONTRACT_CONTENT.title).toBe("Contract create");
    expect(CONTRACT_SCHEDULE.kind).toBe("timed");
  });
});
