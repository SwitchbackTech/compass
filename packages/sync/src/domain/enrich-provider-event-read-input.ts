import { type ProviderEventReadInput } from "@sync/providers/provider-event-reader.port";
import { type ProviderCalendarRecord } from "@sync/storage/contracts/provider-calendar.contracts";
import { type ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";

/** Attach Microsoft mailbox fallback zone when the connection stores one. */
export async function enrichProviderEventReadInput(
  connections: ProviderConnectionRepository | undefined,
  calendar: Pick<
    ProviderCalendarRecord,
    "tenantId" | "principalId" | "connectionId"
  >,
  input: ProviderEventReadInput,
): Promise<ProviderEventReadInput> {
  if (!connections || input.fallbackIanaTimeZone) return input;
  const connection = await connections.findById(
    calendar.tenantId,
    calendar.principalId,
    calendar.connectionId,
  );
  if (connection?.provider !== "microsoft") return input;
  const mailboxTimeZone = connection.account["mailboxTimeZone"];
  if (!mailboxTimeZone) return input;
  return { ...input, fallbackIanaTimeZone: mailboxTimeZone };
}
