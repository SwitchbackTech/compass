import { RootState } from "@web/store";

export const selectDatesInView = (state: RootState) => state.view.dates;
