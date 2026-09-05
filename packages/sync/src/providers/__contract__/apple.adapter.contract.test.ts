import { describeProviderContract } from "@sync/providers/__contract__/adapter-contract";
import { appleRecordedFactory } from "@sync/providers/__contract__/apple-contract.factory";

describeProviderContract("apple", appleRecordedFactory, {
  calendarId: "/123456789/calendars/home/",
  skipAuthExchange: true,
  skipAuthRevoked: true,
  skipWatch: true,
  skipNotifications: true,
  skipNormalizerRoundTrip: true,
});
