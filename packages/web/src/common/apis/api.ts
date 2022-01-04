import axios from "axios";

import { BASEURL } from "@web/common/constants/api";

const headers = {
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
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
