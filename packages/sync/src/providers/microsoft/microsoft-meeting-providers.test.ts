import {
  clearMeetingSettingsCacheForTests,
  pickTeamsOnlineMeetingProvider,
} from "@sync/providers/microsoft/microsoft-meeting-providers";

describe("pickTeamsOnlineMeetingProvider", () => {
  it("uses the default when it is a Teams provider", () => {
    expect(
      pickTeamsOnlineMeetingProvider({
        defaultOnlineMeetingProvider: "teamsForBusiness",
        allowedOnlineMeetingProviders: ["teamsForBusiness", "skypeForConsumer"],
      }),
    ).toBe("teamsForBusiness");
  });

  it("uses the first allowed Teams provider when the default is not Teams", () => {
    expect(
      pickTeamsOnlineMeetingProvider({
        defaultOnlineMeetingProvider: "skypeForConsumer",
        allowedOnlineMeetingProviders: ["skypeForConsumer", "teamsForConsumer"],
      }),
    ).toBe("teamsForConsumer");
  });

  it("returns null when no Teams provider is allowed", () => {
    expect(
      pickTeamsOnlineMeetingProvider({
        defaultOnlineMeetingProvider: "skypeForConsumer",
        allowedOnlineMeetingProviders: ["skypeForConsumer"],
      }),
    ).toBeNull();
  });
});

describe("readCachedCalendarMeetingSettings", () => {
  afterEach(() => {
    clearMeetingSettingsCacheForTests();
  });

  it("fetches meeting settings once per access token within the TTL", async () => {
    const { readCachedCalendarMeetingSettings } = await import(
      "@sync/providers/microsoft/microsoft-meeting-providers"
    );
    let calls = 0;
    const api = {
      async getCalendarMeetingSettings() {
        calls += 1;
        return {
          defaultOnlineMeetingProvider: "teamsForBusiness",
          allowedOnlineMeetingProviders: ["teamsForBusiness"],
        };
      },
    };

    const first = await readCachedCalendarMeetingSettings(
      "token-a",
      api,
      () => 0,
    );
    const second = await readCachedCalendarMeetingSettings(
      "token-a",
      api,
      () => 1,
    );

    expect(first).toEqual(second);
    expect(calls).toBe(1);
  });
});
