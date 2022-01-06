import axios from "axios";

import { Priorities } from "@core/core.constants";

import { colorNameByPriority } from "@web/common/styles/colors";
import { BASEURL } from "@web/common/constants/api";
import { headers } from "../helpers";

const PriorityApi = {
  async createPriorities(token: string) {
    const priorities = [
      {
        name: Priorities.SELF,
        color: colorNameByPriority.self,
      },
      {
        name: Priorities.WORK,
        color: colorNameByPriority.work,
      },
      {
        name: Priorities.RELATIONS,
        color: colorNameByPriority.relations,
      },
    ];
    const _headers = headers(token);

    const [p1, p2, p3] = await Promise.all([
      await axios.post(`${BASEURL}/priority`, priorities[0], _headers),
      await axios.post(`${BASEURL}/priority`, priorities[1], _headers),
      await axios.post(`${BASEURL}/priority`, priorities[2], _headers),
    ]);
    const combined = [p1, p2, p3];
    return combined;
  },

  async getPriorities() {
    const response = await axios.get(`${BASEURL}/priority/find`, headers());
    return response.data;
  },
};

export { PriorityApi };
