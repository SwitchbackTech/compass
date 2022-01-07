import axios from "axios";
import { v4 as uuidv4 } from "uuid";

import { Params_Events_Wip, Schema_Event_Wip } from "@core/types/event.types";
import { headers } from "@web/common/helpers";
import { BASEURL } from "@web/common/constants/api";
import {
  createEventLocalStorage,
  editEventOld,
  getEventsLocalStorage,
} from "@web/ducks/events/fakeApi";

//TODO Move this to ducks/events (?)
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
