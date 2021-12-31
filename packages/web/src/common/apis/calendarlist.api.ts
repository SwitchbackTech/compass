import axios from 'axios';

import { BASEURL } from '@common/constants/api';
import { headers } from '@common/helpers';
import { Schema_CalendarList } from '@core/types/calendar.types';

const CalendarList = {
  async list(): Promise<Schema_CalendarList> {
    const response = await axios.get(`${BASEURL}/calendar/list`, headers());
    return response.data;
  },
};

export { CalendarList };
