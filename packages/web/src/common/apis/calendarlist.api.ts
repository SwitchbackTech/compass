import axios from "axios";

import { Schema_CalendarList } from "@core/types/calendar.types";
import { gSchema$CalendarList } from "../../../../backend/declarations";

import { BASEURL } from "@web/common/constants/api";
import { headers } from "@web/common/helpers";

const CalendarListApi = {
  async list(): Promise<gSchema$CalendarList> {
    const response = await axios.get(`${BASEURL}/calendarlist`, headers());
    return response.data;
  },

  async create(payload: Schema_CalendarList) {
    const response = await axios.post(
      `${BASEURL}/calendarlist`,
      payload,
      headers()
    );
    return response.data;
  },
};

export { CalendarListApi };
