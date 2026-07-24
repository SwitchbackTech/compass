import {
  type Calendar,
  CalendarListResponseSchema,
  type SetCalendarVisibilityInput,
} from "@core/types/calendar.contracts";
import { BaseApi } from "@web/api/base/base.api";

const CalendarApi = {
  list: async (): Promise<Calendar[]> => {
    const response = await BaseApi.get<unknown>("/calendars");
    return CalendarListResponseSchema.parse(response.data).calendars;
  },
  setVisibility: (input: SetCalendarVisibilityInput) => {
    return BaseApi.put<void>("/calendars/select", input);
  },
};

export { CalendarApi };
