import { describeProviderContract } from "@sync/providers/__contract__/adapter-contract";
import { googleRecordedFactory } from "@sync/providers/__contract__/google-contract.factory";

describeProviderContract("google", googleRecordedFactory);
