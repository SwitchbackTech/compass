import { type ProviderAuthAdapter } from "@sync/providers/provider-auth.port";

export interface AuthContractCase {
  readonly name: string;
  run(adapter: ProviderAuthAdapter): Promise<void>;
}
