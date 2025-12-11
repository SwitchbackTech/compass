import {
  Dispatch,
  PropsWithChildren,
  createContext,
  useCallback,
  useState,
} from "react";
import { Schema_Event } from "@core/types/event.types";
import { useOpenAtCursorPosition } from "@web/common/hooks/useMousePosition";
import { useMaxAgendaZIndex } from "@web/views/Day/hooks/events/useMaxAgendaZIndex";
import { useOpenEventForm } from "@web/views/Forms/hooks/useOpenEventForm";
import { useSaveEventForm } from "@web/views/Forms/hooks/useSaveEventForm";

interface DraftProviderV2Props
  extends ReturnType<typeof useOpenAtCursorPosition> {
  draft: Schema_Event | null;
  existing: boolean;
  maxAgendaZIndex: number;
  setDraft: Dispatch<React.SetStateAction<Schema_Event | null>>;
  setExisting: Dispatch<React.SetStateAction<boolean>>;
  openEventForm: (
    create?: boolean,
    cursor?: Pick<MouseEvent, "clientX" | "clientY">,
  ) => void;
  closeEventForm: () => void;
  onDelete: () => void;
  onSave: (draft: Schema_Event | null) => void;
}

export const DraftContextV2 = createContext<DraftProviderV2Props | null>(null);

export function DraftProviderV2({ children }: PropsWithChildren) {
  const [existing, setExisting] = useState<boolean>(false);
  const [draft, setDraft] = useState<Schema_Event | null>(null);
  const maxAgendaZIndex = useMaxAgendaZIndex();

  const onOpenChange = useCallback(
    (open: boolean) => {
      if (!open) setDraft(null);
    },
    [setDraft],
  );

  const openAtCursor = useOpenAtCursorPosition({ onOpenChange });

  const openEventForm = useOpenEventForm({
    setDraft,
    setExisting,
    setReference: openAtCursor.setReference,
    setOpenAtMousePosition: openAtCursor.setOpenAtMousePosition,
  });

  const closeEventForm = useCallback(() => {
    openAtCursor.setOpenAtMousePosition(false);
  }, [openAtCursor.setOpenAtMousePosition]);

  const onSave = useSaveEventForm({ existing, closeEventForm });

  const onDelete = useCallback(() => {}, []);

  return (
    <DraftContextV2.Provider
      value={{
        ...openAtCursor,
        draft,
        setDraft,
        existing,
        maxAgendaZIndex,
        setExisting,
        openEventForm,
        closeEventForm,
        onDelete,
        onSave,
      }}
    >
      {children}
    </DraftContextV2.Provider>
  );
}
