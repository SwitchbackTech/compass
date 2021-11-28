import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

import { EventEntity } from '@common/types/entities';

import { createEvent, editEvent, getEvents, GetEventsParams } from './fakeApi';
import { hardCodedEvents } from './event.data';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

/** ********************** */
/* Helpers */
/** ********************** */
const convertToBackendModel = (frontendEvent) => {
  return 'TODO';
};

export const getEventsLocalStorage = async (): Promise<EventEntity[]> =>
  (JSON.parse(localStorage.getItem('events') || '[]') as EventEntity[]) || [];

const getEventsHelper = async () => {
  const basicEvents = [
    {
      priority: 'work',
      startDate: '2021-10-25 17:30',
      endDate: '2021-10-25 18:45',
      isTimeSelected: false,
      isOpen: false,
      title: 'Presentation',
      id: '456',
    },
    {
      priority: 'self',
      startDate: '2021-10-25 15:30',
      endDate: '2021-10-25 17:00',
      isTimeSelected: true,
      showStartTimeLabel: true,
      isOpen: true,
      title: 'Walk dog',
      id: '123',
    },
    {
      priority: 'relations',
      startDate: '2021-10-26 15:30',
      endDate: '2021-10-26 18:00',
      isTimeSelected: true,
      isOpen: true,
      title: 'with desc',
      showStartTimeLabel: true,
      description: 'an event with a description',
      id: '789',
    },
  ];
  // return hardCodedEvents;
  return basicEvents;
};

export interface GetEventsParams {
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  priorities?: Priorities[];
}
/*
  So page is needed for someday event lists
  (to not fetching all existing events and filter them on front end because of perfomance)
  When user clicks on "<" | ">" we fetch events with appropriate page and pagesize
  (for example with 20 events per page). So the api response will be faster
  and front end don't filter events by pages

  Until api is not implemented i decided to store all events in localStorage
  and filter them in fake api module. When api is finished and ready to communicate
  - remove localStorage and replace the api methods
  in this module with axios.get(url, { params })

  So ideally back end has to be able to response with page info so front end can receive not all events in one response
  Because if we request all events once the next thing we'll need to do on front end side is filtering and sorting.
  So imagine we have more than 10000 events per user.
  We will have to fetch all 10k events which can take more time than user expects.
  The other issue is perfomance (for big data)
  Front end will have to filter all events and than sort them all.
  That will cause perfomance isues especially on mobile devices when the amount of events is really big
*/

/** ********************** */
/* API */
/** ********************** */

export const eventsApi = {
  getEvents: (params: GetEventsParams) => {
    // replace this with axios.get('api/events', { params });
    return getEvents(params);
  },

  createEvent: (event: EventEntity) => {
    // replace this with axios.post('api/events', event);
    return createEvent(event);
  },

  editEvent: (id: string, event: EventEntity) => {
    // replace this with axios.put(`api/events/${id}`, event);
    return editEvent(id, event);
  },
};
