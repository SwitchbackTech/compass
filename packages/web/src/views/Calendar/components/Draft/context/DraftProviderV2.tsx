import {
  Dispatch,
  FocusEvent,
  MouseEvent,
  PropsWithChildren,
  SetStateAction,
  createContext,
  useCallback,
  useState,
} from "react";
import { Schema_Event } from "@core/types/event.types";
import { CursorItem } from "@web/common/context/open-at-cursor";
import { useOpenAtCursor } from "@web/common/hooks/useOpenAtCursor";
import { useOpenAgendaEventPreview } from "@web/views/Day/hooks/events/useOpenAgendaEventPreview";
import { useOpenEventForm } from "@web/views/Forms/hooks/useOpenEventForm";
import { useSaveEventForm } from "@web/views/Forms/hooks/useSaveEventForm";
import { useOpenEventContextMenu } from "../../../../Day/hooks/events/useOpenEventContextMenu";

interface DraftProviderV2Props {
  draft: Schema_Event | null;
  nodeId: CursorItem | null;
  existing: boolean;
  setDraft: Dispatch<SetStateAction<Schema_Event | null>>;
  setExisting: Dispatch<SetStateAction<boolean>>;
  openAgendaEventPreview: ReturnType<typeof useOpenAgendaEventPreview>;
  openEventContextMenu: ReturnType<typeof useOpenEventContextMenu>;
  openEventForm: ReturnType<typeof useOpenEventForm>;
  setNodeId: Dispatch<SetStateAction<CursorItem | null>>;
  closeOpenedAtCursor: (
    e: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>,
  ) => void;
  onDelete: () => void;
  onSave: (draft: Schema_Event | null) => void;
}

export const DraftContextV2 = createContext<DraftProviderV2Props | null>(null);

export function DraftProviderV2({ children }: PropsWithChildren) {
  const [existing, setExisting] = useState<boolean>(false);
  const [draft, setDraft] = useState<Schema_Event | null>(null);

  const onOpenChange = useCallback(
    (open: boolean) => {
      if (!open) setDraft(null);
    },
    [setDraft],
  );

  const { nodeId, setNodeId, setPlacement } = useOpenAtCursor({ onOpenChange });

  const openEventForm = useOpenEventForm({ setDraft, setExisting });

  const openAgendaEventPreview = useOpenAgendaEventPreview({ setDraft });

  const openEventContextMenu = useOpenEventContextMenu({ setDraft });

  const closeOpenedAtCursor = useCallback(
    (e: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setPlacement("right-start");
      setNodeId(null);
    },
    [setNodeId],
  );

  const onSave = useSaveEventForm({
    existing,
    closeEventForm: () => setNodeId(null),
  });

  const onDelete = useCallback(() => {}, []);

  return (
    <DraftContextV2.Provider
      value={{
        draft,
        nodeId,
        setDraft,
        setNodeId,
        existing,
        setExisting,
        openEventForm,
        closeOpenedAtCursor,
        openAgendaEventPreview,
        openEventContextMenu,
        onDelete,
        onSave,
      }}
    >
      {children}
    </DraftContextV2.Provider>
  );
}
