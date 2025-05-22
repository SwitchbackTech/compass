import { CompassApi } from "./compass.api";

export const WaitlistApi = {
  async getWaitlistStatus(email: string) {
    const res = await CompassApi.get(`/waitlist`, { params: { email } });
    return res.data;
  },
};
