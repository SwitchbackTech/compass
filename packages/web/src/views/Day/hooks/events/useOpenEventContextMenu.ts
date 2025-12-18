import { FocusEvent, MouseEvent, useCallback } from "react";
import { useStore } from "react-redux";
import { DATA_EVENT_ELEMENT_ID } from "@web/common/constants/web.constants";
import {
  CursorItem,
  openFloatingAtCursor,
} from "@web/common/hooks/useOpenAtCursor";
import { selectEventById } from "@web/ducks/events/selectors/event.selectors";
import { RootState } from "@web/store";
import { setDraft } from "@web/views/Calendar/components/Draft/context/useDraft";
import { getEventClass } from "@web/views/Day/util/agenda/focus.util";

export function useOpenEventContextMenu() {
  const store = useStore<RootState>();

  const openEventContextMenu = useCallback(
    (e: MouseEvent<Element> | FocusEvent<Element>) => {
      e.preventDefault();
      e.stopPropagation();

      const element = e.currentTarget;
      const eventClass = getEventClass(element);
      const reference = element?.closest(`.${eventClass}`);
      const eventId = reference?.getAttribute(DATA_EVENT_ELEMENT_ID);
      const nodeId = CursorItem.EventContextMenu;

      if (!eventId || !reference) return;

      const draftEvent = selectEventById(store.getState(), eventId);

      setDraft(draftEvent);
      openFloatingAtCursor({ nodeId, placement: "bottom", reference });
    },
    [store],
  );

  return openEventContextMenu;
}
