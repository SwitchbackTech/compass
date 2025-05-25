import { CompassApi } from "./compass.api";

export const WaitlistApi = {
  async getWaitlistStatus(email: string) {
    const { data } = await CompassApi.get<{
      isOnWaitlist: boolean;
      isInvited: boolean;
      isActive: boolean;
    }>(`/waitlist`, { params: { email } });
    return data;
  },
};
