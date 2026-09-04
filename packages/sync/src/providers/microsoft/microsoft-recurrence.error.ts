import { ProviderError } from "@sync/providers/provider-error";

export class UnsupportedRecurrenceError extends ProviderError<"unsupportedRecurrence"> {
  constructor(message: string) {
    super("unsupportedRecurrence", message);
  }
}
