import axios from "axios";
import { Schema_CalendarList } from "@core/types/calendar.types";
import { API_BASEURL } from "@web/common/constants/web.constants";
import { headers } from "@web/common/utils";
import { gSchema$CalendarList } from "@core/types/gcal";

const CalendarListApi = {
  async list(): Promise<gSchema$CalendarList> {
    const response: Schema_CalendarList = await axios.get(
      `${API_BASEURL}/calendarlist`,
      headers()
    );
    console.log(response.data);
    return response.data;
  },

  async create(payload: Schema_CalendarList) {
    const response = await axios.post(
      `${API_BASEURL}/calendarlist`,
      payload,
      headers()
    );
    console.log(response.data);
    return response.data;
  },
};

export { CalendarListApi };
