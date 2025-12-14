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
import { useOpenAtCursor } from "@web/common/hooks/useOpenAtCursor";
import { useOpenAgendaEventPreview } from "@web/views/Day/hooks/events/useOpenAgendaEventPreview";
import { useOpenEventContextMenu } from "@web/views/Day/hooks/events/useOpenEventContextMenu";
import { useOpenEventForm } from "@web/views/Forms/hooks/useOpenEventForm";
import { useSaveEventForm } from "@web/views/Forms/hooks/useSaveEventForm";

interface DraftProviderV2Props {
  draft: Schema_Event | null;
  existing: boolean;
  setDraft: Dispatch<SetStateAction<Schema_Event | null>>;
  setExisting: Dispatch<SetStateAction<boolean>>;
  openAgendaEventPreview: ReturnType<typeof useOpenAgendaEventPreview>;
  openEventContextMenu: ReturnType<typeof useOpenEventContextMenu>;
  openEventForm: ReturnType<typeof useOpenEventForm>;
  closeOpenAtCursor: () => void;
  handleCloseOpenAtCursor: (
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

  const openAtCursor = useOpenAtCursor({ onOpenChange });

  const openEventForm = useOpenEventForm({ setDraft, setExisting });

  const openAgendaEventPreview = useOpenAgendaEventPreview({ setDraft });

  const openEventContextMenu = useOpenEventContextMenu({ setDraft });

  const { closeOpenAtCursor } = openAtCursor;

  const handleCloseOpenAtCursor = useCallback(
    (e: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
      e.preventDefault();
      e.stopPropagation();
      closeOpenAtCursor();
    },
    [closeOpenAtCursor],
  );

  const onSave = useSaveEventForm({
    existing,
    closeEventForm: closeOpenAtCursor,
  });

  const onDelete = useCallback(() => {}, []);

  return (
    <DraftContextV2.Provider
      value={{
        draft,
        setDraft,
        existing,
        setExisting,
        openEventForm,
        closeOpenAtCursor,
        handleCloseOpenAtCursor,
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
