import { LocalStorage } from "@web/common/constants/web.constants";

export const headers = (token?: string) => {
  if (token) {
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  } else {
    return {
      headers: {
        Authorization: `Bearer ${localStorage.getItem(LocalStorage.TOKEN)}`,
      },
    };
  }
};

// $$ change conditional after updating date schema
// move to a helper file -- doesnt need to be connected
// to week events
export const isAllDay = (event: Schema_Event) =>
  event !== undefined &&
  // 'YYYY-MM-DD' has 10 chars
  event.startDate?.length === 10 &&
  event.endDate?.length === 10;

export const roundByNumber = (number: number, roundBy: number): number =>
  Math.ceil(number / roundBy) * roundBy;
