import axios from 'axios';

import { colorNameByPriority } from '@common/styles/colors';
import { Priorities } from '@common/types/entities';
import { BASEURL } from '@common/constants/api';

const PriorityApi = {
  async createPriorities(token: string) {
    // custom header to allow for token arg
    const _pHeaders = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

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

    console.log('creating priorities ... ');
    const [p1, p2, p3] = await Promise.all([
      await axios.post(`${BASEURL}/priority`, priorities[0], _pHeaders),
      await axios.post(`${BASEURL}/priority`, priorities[1], _pHeaders),
      await axios.post(`${BASEURL}/priority`, priorities[2], _pHeaders),
    ]);
    const combined = [p1, p2, p3];
    return combined;
  },

  async getPriorities() {
    const response = await axios.get(`${BASEURL}/priority/find`, headers);
    return response.data;
  },
};

export { PriorityApi };
