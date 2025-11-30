import React, { createContext, useCallback, useContext, useState } from "react";
import {
  FloatingContext,
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
} from "@floating-ui/react";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import dayjs, { Dayjs } from "@core/util/date/dayjs";
import { getUserId } from "@web/auth/auth.util";
import { createEventSlice } from "@web/ducks/events/slices/event.slice";
import { useAppDispatch } from "@web/store/store.hooks";
import { getTimeFromPosition } from "@web/views/Day/util/agenda/agenda.util";

const DEFAULT_DURATION_MINUTES = 60;

interface DayDraftContextValue {
  draftEvent: Schema_Event | null;
  isFormOpen: boolean;
  floatingProps: {
    refs: ReturnType<typeof useFloating>["refs"];
    x: number | null;
    y: number | null;
    strategy: "fixed" | "absolute";
    context: FloatingContext;
    getFloatingProps: (
      props?: React.HTMLProps<HTMLElement>,
    ) => Record<string, unknown>;
  };
  openFormAtPosition: (
    yPosition: number,
    dateInView: Dayjs,
    clickX: number,
    clickY: number,
  ) => Promise<void>;
  closeForm: () => void;
  setDraftEvent: (event: Schema_Event | null) => void;
  submitDraft: (event: Schema_Event) => void;
}

const DayDraftContext = createContext<DayDraftContextValue | undefined>(
  undefined,
);

export const useDayDraftContext = () => {
  const context = useContext(DayDraftContext);
  if (!context) {
    throw new Error("useDayDraftContext must be used within DayDraftProvider");
  }
  return context;
};

export const DayDraftProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const dispatch = useAppDispatch();
  const [draftEvent, setDraftEvent] = useState<Schema_Event | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { refs, x, y, strategy, context } = useFloating({
    placement: "right-start",
    middleware: [offset(10), flip(), shift({ padding: 8 })],
    open: isFormOpen,
    onOpenChange: setIsFormOpen,
    whileElementsMounted: autoUpdate,
  });

  useDismiss(context, {
    escapeKey: true,
    outsidePress: true,
  });

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setDraftEvent(null);
  }, []);

  const openFormAtPosition = useCallback(
    async (
      yPosition: number,
      dateInView: Dayjs,
      clickX: number,
      clickY: number,
    ) => {
      const startTime = getTimeFromPosition(yPosition, dateInView);
      const endTime = dayjs(startTime)
        .add(DEFAULT_DURATION_MINUTES, "minutes")
        .toDate();

      const userId = await getUserId();

      const newDraft: Schema_Event = {
        title: "",
        description: "",
        startDate: startTime.toISOString(),
        endDate: endTime.toISOString(),
        isAllDay: false,
        isSomeday: false,
        user: userId,
        priority: Priorities.UNASSIGNED,
        origin: Origin.COMPASS,
      };

      // Set the virtual reference element where the user clicked
      refs.setReference({
        getBoundingClientRect: () => ({
          x: clickX,
          y: clickY,
          top: clickY,
          left: clickX,
          bottom: clickY,
          right: clickX,
          width: 0,
          height: 0,
          toJSON: () => ({}),
        }),
      });

      setDraftEvent(newDraft);
      setIsFormOpen(true);
    },
    [refs],
  );

  const submitDraft = useCallback(
    (event: Schema_Event) => {
      dispatch(createEventSlice.actions.request(event));
      closeForm();
    },
    [dispatch, closeForm],
  );

  const value: DayDraftContextValue = {
    draftEvent,
    isFormOpen,
    floatingProps: {
      refs,
      x,
      y,
      strategy,
      context,
      getFloatingProps: (props) => props ?? {},
    },
    openFormAtPosition,
    closeForm,
    setDraftEvent,
    submitDraft,
  };

  return (
    <DayDraftContext.Provider value={value}>
      {children}
    </DayDraftContext.Provider>
  );
};
