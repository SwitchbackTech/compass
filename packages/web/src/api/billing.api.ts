import {
  type BillingCheckoutResponse,
  BillingCheckoutResponseSchema,
  type BillingPortalResponse,
  BillingPortalResponseSchema,
  type BillingStatusResponse,
  BillingStatusResponseSchema,
} from "@core/types/billing.types";
import { BaseApi } from "@web/api/base/base.api";

const BillingApi = {
  async getStatus(): Promise<BillingStatusResponse> {
    const response =
      await BaseApi.get<BillingStatusResponse>(`/billing/status`);
    return BillingStatusResponseSchema.parse(response.data);
  },

  async createCheckoutSession(): Promise<BillingCheckoutResponse> {
    const response = await BaseApi.post<BillingCheckoutResponse>(
      `/billing/checkout/session`,
    );
    return BillingCheckoutResponseSchema.parse(response.data);
  },

  async createPortalSession(): Promise<BillingPortalResponse> {
    const response = await BaseApi.post<BillingPortalResponse>(
      `/billing/portal/session`,
    );
    return BillingPortalResponseSchema.parse(response.data);
  },
};

export { BillingApi };
