import axios from "axios";
import { Schema_CalendarList } from "@core/types/calendar.types";
import { gSchema$CalendarList } from "@core/types/gcal";
import { ENV_WEB } from "@web/common/constants/env.constants";

const headers = (token?: string) => {
  if (token) {
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  } else {
    return {
      headers: {
        Authorization: `Bearer ${localStorage.getItem(
          "removedAsPartOfTokenRefactor",
        )}`,
      },
    };
  }
};

const CalendarListApi = {
  async list(): Promise<gSchema$CalendarList> {
    const response: Schema_CalendarList = await axios.get(
      `${ENV_WEB.API_BASEURL}/calendarlist`,
      headers(),
    );
    return response.data;
  },

  async create(payload: Schema_CalendarList) {
    const response = await axios.post(
      `${ENV_WEB.API_BASEURL}/calendarlist`,
      payload,
      headers(),
    );
    return response.data;
  },
};

export { CalendarListApi };
