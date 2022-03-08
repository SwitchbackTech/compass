import axios from "axios";

import { Schema_CalendarList } from "@core/types/calendar.types";
import { gSchema$CalendarList } from "../../../../backend/declarations";

import { API_BASEURL } from "@web/common/constants/web.constants";
import { headers } from "@web/common/utils";

const CalendarListApi = {
  async list(): Promise<gSchema$CalendarList> {
    const response = await axios.get(`${API_BASEURL}/calendarlist`, headers());
    return response.data;
  },

  async create(payload: Schema_CalendarList) {
    const response = await axios.post(
      `${API_BASEURL}/calendarlist`,
      payload,
      headers()
    );
    return response.data;
  },
};

export { CalendarListApi };
