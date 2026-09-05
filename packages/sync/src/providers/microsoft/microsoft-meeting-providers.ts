export interface GraphCalendarMeetingSettings {
  readonly allowedOnlineMeetingProviders?: readonly string[];
  readonly defaultOnlineMeetingProvider?: string;
}

export interface MicrosoftMeetingProvidersApi {
  getCalendarMeetingSettings(): Promise<GraphCalendarMeetingSettings>;
}

const TEAMS_PROVIDERS = new Set(["teamsForBusiness", "teamsForConsumer"]);

export const MICROSOFT_MEETING_SETTINGS_CACHE_TTL_MS = 5 * 60 * 1000;

interface CachedMeetingSettings {
  readonly expiresAtMs: number;
  readonly settings: GraphCalendarMeetingSettings;
}

const meetingSettingsCache = new Map<string, CachedMeetingSettings>();

export function isTeamsOnlineMeetingProvider(provider: string): boolean {
  return TEAMS_PROVIDERS.has(provider);
}

export function pickTeamsOnlineMeetingProvider(
  settings: GraphCalendarMeetingSettings,
): string | null {
  const defaultProvider = settings.defaultOnlineMeetingProvider;
  if (defaultProvider && isTeamsOnlineMeetingProvider(defaultProvider)) {
    return defaultProvider;
  }
  return (
    settings.allowedOnlineMeetingProviders?.find(
      isTeamsOnlineMeetingProvider,
    ) ?? null
  );
}

export async function readCachedCalendarMeetingSettings(
  accessToken: string,
  api: MicrosoftMeetingProvidersApi,
  nowMs: () => number = () => Date.now(),
): Promise<GraphCalendarMeetingSettings> {
  const cached = meetingSettingsCache.get(accessToken);
  if (cached && cached.expiresAtMs > nowMs()) {
    return cached.settings;
  }

  const settings = await api.getCalendarMeetingSettings();
  meetingSettingsCache.set(accessToken, {
    settings,
    expiresAtMs: nowMs() + MICROSOFT_MEETING_SETTINGS_CACHE_TTL_MS,
  });
  return settings;
}

export function clearMeetingSettingsCacheForTests(): void {
  meetingSettingsCache.clear();
}
