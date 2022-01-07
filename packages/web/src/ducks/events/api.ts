import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

import { Params_Events_Wip, Schema_Event_Wip } from "@core/types/event.types";
import { headers } from "@web/common/helpers";
import { BASEURL } from "@web/common/constants/api";
import {
  createEventLocalStorage,
  editEventOld,
  getEventsLocalStorage,
} from "@web/ducks/events/event.helpers";

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
  createEvt(event: Schema_Event_Wip) {
    return "TODO-implement";
  },

  createEvtOld(event: Schema_Event_Wip) {
    return createEventLocalStorage(event);
  },

  async deleteEvt(gId) {
    const response = await axios.delete(
      `${BASEURL}/event/delete?eventId=${gId}`,
      headers()
    );
    return response.data;
  },

  editEvent: (id: string, event: Schema_Event_Wip) => {
    return editEventOld(id, event);
  },

  getEvts: (params: Params_Events_Wip) => {
    // getEventsLocalStorage();
    return axios.get(`${BASEURL}/event`, headers());
  },

  getEvtsLocalStorage: (params: Params_Events_Wip) => {
    return getEventsLocalStorage();
  },

  // TODO convert to saga
  async import() {
    const response = await axios.post(
      `${BASEURL}/event/import`,
      null,

      headers()
    );
    return response.data;
  },

  // async updateEvt(gId, evt) {
  //   const response = await axios.put(
  //     `${BASEURL}/event/update?eventId=${gId}`,
  //     evt,
  //     headers()
  //   );
  //   return response.data;
  // },
};

export { EventApi };
