/* demo for future reference /extension

import axios from "axios";
import { Priorities } from "@core/constants/core.constants";
import { colorNameByPriority } from "@core/constants/colors";
import { API_BASEURL } from "@web/common/constants/web.constants";

import { headers } from "../utils";

const PriorityApi = {
  async createPriority(token: string) {
    const priority = {
      name: "custom name",
      color: "user-selected color",
    };

    const _headers = headers(token);

    const [p1] = await Promise.all([
      await axios.post(`${API_BASEURL}/priority`, priority, _headers),
    ]);

    const combined = [p1];
    return combined;
  },

  async getPriorities() {
    const response = await axios.get(`${API_BASEURL}/priority`, headers());
    return response.data;
  },
};

export { PriorityApi };
*/
