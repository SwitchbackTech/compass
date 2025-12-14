import {
  Dispatch,
  FocusEvent,
  MouseEvent,
  SetStateAction,
  useCallback,
} from "react";
import { useStore } from "react-redux";
import { Schema_Event } from "@core/types/event.types";
import { DATA_EVENT_ELEMENT_ID } from "@web/common/constants/web.constants";
import { CursorItem } from "@web/common/context/open-at-cursor";
import { useOpenAtCursor } from "@web/common/hooks/useOpenAtCursor";
import { selectEventById } from "@web/ducks/events/selectors/event.selectors";
import { RootState } from "@web/store";
import { getEventClass } from "@web/views/Day/util/agenda/focus.util";

export function useOpenEventContextMenu({
  setDraft,
}: {
  setDraft: Dispatch<SetStateAction<Schema_Event | null>>;
}) {
  const { setNodeId, setPlacement, setReference } = useOpenAtCursor();
  const store = useStore<RootState>();

  const openEventContextMenu = useCallback(
    (e: MouseEvent<Element> | FocusEvent<Element>) => {
      e.preventDefault();
      e.stopPropagation();

      const element = e.currentTarget;
      const eventClass = getEventClass(element);
      const event = element?.closest(`.${eventClass}`);
      const eventId = event?.getAttribute(DATA_EVENT_ELEMENT_ID);

      if (!eventId) return;

      const draftEvent = selectEventById(store.getState(), eventId);

      setPlacement("bottom");
      setReference(event);
      setDraft(draftEvent);
      setNodeId(CursorItem.EventContextMenu);
    },
    [setPlacement, setReference, setDraft, setNodeId, store],
  );

  return openEventContextMenu;
}
