import { type AppleEventResourceInput } from "@sync/providers/apple/apple-event.normalizer";
import { type ProviderEventRead } from "@sync/providers/provider-event.port";

export interface NormalizerContractCase {
  readonly name: string;
  readonly input: AppleEventResourceInput;
  readonly run: (reads: readonly ProviderEventRead[]) => void | Promise<void>;
}
