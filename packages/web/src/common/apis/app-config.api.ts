import { type AppConfig, AppConfigSchema } from "@core/types/auth.types";
import { BaseApi } from "@web/common/apis/base/base.api";

const AppConfigApi = {
  async get(): Promise<AppConfig> {
    const response = await BaseApi.get<AppConfig>(`/config`);
    return AppConfigSchema.parse(response.data);
  },
};

export { AppConfigApi };
