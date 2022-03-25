import axios from "axios";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { Params_Events, Schema_Event } from "@core/types/event.types";
import { headers } from "@web/common/utils";
import { API_BASEURL } from "@web/common/constants/web.constants";

//not sure what this does
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

/*
TODO: Add Pagination  for Someday event lists:
  (to not fetching all existing events and filter them on front end because of perfomance)
  When user clicks on "<" | ">" we fetch events with appropriate page and pagesize
  (for example with 20 events per page). So the api response will be faster
  and front end don't filter events by pages

  Until api is not implemented i decided to store all events in localStorage
  and filter them in fake api module. When api is finished and ready to communicate
  - remove localStorage and replace the api methods
  in this module with axios.get(url, { params })

  So ideally back end has to be able to respond with page info so front end can receive not all events in one response
  Because if we request all events once the next thing we'll need to do on front end side is filtering and sorting.
  So imagine we have more than 10000 events per user.
  We will have to fetch all 10k events which can take more time than user expects.
  The other issue is perfomance (for big data)
  Front end will have to filter all events and than sort them all.
  That will cause perfomance isues especially on mobile devices when the amount of events is really big
*/

const EventApi = {
  create(event: Schema_Event) {
    return axios.post(`${API_BASEURL}/event`, event, headers());
  },

  delete(_id: string) {
    return axios.delete(`${API_BASEURL}/event/${_id}`, headers());
  },

  edit: (_id: string, event: Schema_Event) => {
    return axios.put(`${API_BASEURL}/event/${_id}`, event, headers());
  },

  get: (params: Params_Events) => {
    return axios.get(
      `${API_BASEURL}/event?start=${params.startDate}&end=${params.endDate}`,
      headers()
    );
  },

  // TODO convert to saga
  async import() {
    const response = await axios.post(
      `${API_BASEURL}/event/import`,
      null,

      headers()
    );
    return response.data;
  },
};

export { EventApi };
