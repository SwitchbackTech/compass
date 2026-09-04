import { type ProviderCalendarAdapter } from "@sync/providers/provider-calendar.port";

export interface DiscoveryContractCase {
  readonly name: string;
  readonly username: string;
  readonly password: string;
  readonly run: (adapter: ProviderCalendarAdapter) => Promise<void>;
}
