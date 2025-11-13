import { UserMetadata } from "@core/types/user.types";
import { CompassApi } from "@web/common/apis/compass.api";

const UserApi = {
  async getMetadata(): Promise<UserMetadata> {
    const response = await CompassApi.get<UserMetadata>(`/user/metadata`);
    return response.data;
  },

  async updateMetadata(data: UserMetadata): Promise<UserMetadata> {
    const response = await CompassApi.post<UserMetadata>(
      `/user/metadata`,
      data,
    );

    return response.data;
  },
};

export { UserApi };
