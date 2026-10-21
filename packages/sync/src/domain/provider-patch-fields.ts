import { type ProviderEvent } from "@sync/providers/provider-event.port";
import { type ProviderPatchInput } from "@sync/providers/provider-event-writer.port";

export function providerLabelPatchFields(
  event: Pick<ProviderEvent, "usesEventLabelColor">,
): Pick<ProviderPatchInput, "usesEventLabelColor"> {
  return event.usesEventLabelColor ? { usesEventLabelColor: true } : {};
}
