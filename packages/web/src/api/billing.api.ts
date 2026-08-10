import { type BillingStatusResponse } from "@core/types/billing.types";
import { BaseApi } from "@web/api/base/base.api";

const BillingApi = {
  async getStatus(): Promise<BillingStatusResponse> {
    const response =
      await BaseApi.get<BillingStatusResponse>(`/billing/status`);
    return response.data;
  },

  async startTrial(): Promise<BillingStatusResponse> {
    const response =
      await BaseApi.post<BillingStatusResponse>(`/billing/trial/start`);
    return response.data;
  },
};

export { BillingApi };
