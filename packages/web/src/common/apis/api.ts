import axios from 'axios';

import { BASEURL } from '@common/constants/api';

const headers = {
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  },
};

const Apis = {
  async createEvt(evtData) {
    const response = await axios.post(
      `${BASEURL}/event/create`,
      evtData,
      headers
    );
    return response.data;
  },

  async deleteEvt(gId) {
    const response = await axios.delete(
      `${BASEURL}/event/delete?eventId=${gId}`,
      headers
    );
    return response.data;
  },

  async getEvts() {
    const response = await axios.get(`${BASEURL}/event/find`, headers);
    return response.data;
  },

  async getFocusEvts() {
    const url = `${BASEURL}/event/find?isFocus=true`;
    const response = await axios.get(url, headers);
    return response.data;
  },

  async getTimeByPriority(start, end) {
    const response = await axios.get(
      `${BASEURL}/report/timeByPriority?startTime=${start}&endTime=${end}`,
      headers
    );
    return response.data;
  },

  async getUser() {
    const response = await axios.get(`${BASEURL}/user/find`, {
      headers,
    });
    return response.data;
  },

  async updateEvt(gId, evt) {
    const response = await axios.put(
      `${BASEURL}/event/update?eventId=${gId}`,
      evt,
      headers
    );
    return response.data;
  },
};

export { Apis };
