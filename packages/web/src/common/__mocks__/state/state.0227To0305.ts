import {
  CLIMB,
  MARCH_1,
  MULTI_WEEK,
  TY_TIM,
} from "@core/__mocks__/events/events.misc";

export const febToMarState = {
  events: {
    getWeekEvents: {
      // isProcessing: false,
      // isSuccess: true,
      // error: null,
      value: {
        data: [CLIMB._id, MARCH_1._id, MULTI_WEEK._id, TY_TIM._id],
      },
    },

    entities: {
      value: {
        [MULTI_WEEK._id]: MULTI_WEEK,
        [MARCH_1._id]: MARCH_1,
        [TY_TIM._id]: TY_TIM,
        [CLIMB._id]: CLIMB,
      },
    },
  },
};
