import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { IS_DEV } from "@web/common/constants/env.constants";

export type EventFormCmdHandlers = {
  onSave: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
  onCopyMeetingLink: () => void;
  onJumpToActions: () => void;
  onCancelMeeting?: () => void;
  onRescheduleMeeting?: () => void;
};

type State = {
  handlers: EventFormCmdHandlers | null;
  hasMeetingLink: boolean;
  isExistingEvent: boolean;
  isReadOnly: boolean;
  showBookingFormActions: boolean;
};

const initialState: State = {
  handlers: null,
  hasMeetingLink: false,
  isExistingEvent: false,
  isReadOnly: false,
  showBookingFormActions: false,
};

export const useEventFormCmdStore = create<State>()(
  devtools(() => initialState, {
    name: "compass/event-form-cmd",
    enabled: IS_DEV,
  }),
);

export const eventFormCmdActions = {
  register: (payload: State) =>
    useEventFormCmdStore.setState(payload, false, { type: "register" }),
  clear: () =>
    useEventFormCmdStore.setState(initialState, false, { type: "clear" }),
};

export const selectEventFormCmdHandlers = (state: State) => state.handlers;
