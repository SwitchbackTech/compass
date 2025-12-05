import {
  Dispatch,
  MouseEvent,
  PropsWithChildren,
  TouchEvent,
  createContext,
  useCallback,
  useState,
} from "react";
import { Schema_Event } from "@core/types/event.types";
import { useCloseEventForm } from "@web/views/Forms/hooks/useCloseEventForm";
import { useOpenEventForm } from "@web/views/Forms/hooks/useOpenEventForm";
import { useSaveEventForm } from "@web/views/Forms/hooks/useSaveEventForm";

interface DraftProviderV2Props {
  draft: Schema_Event | null;
  setDraft: Dispatch<React.SetStateAction<Schema_Event | null>>;
  openEventForm: (e: MouseEvent<HTMLElement> | TouchEvent<HTMLElement>) => void;
  closeEventForm: () => void;
  onDelete: () => void;
  onSave: (draft: Schema_Event | null) => void;
}

export const DraftContextV2 = createContext<DraftProviderV2Props | null>(null);

export function DraftProviderV2({ children }: PropsWithChildren) {
  const [existing, setExisting] = useState<boolean>(false);
  const [draft, setDraft] = useState<Schema_Event | null>(null);
  const openEventForm = useOpenEventForm({ setDraft, setExisting });
  const closeEventForm = useCloseEventForm({ setDraft });
  const onSave = useSaveEventForm({ existing, closeEventForm });
  const onDelete = useCallback(() => {}, []);

  const openForm = useCallback(
    (e: MouseEvent<HTMLElement> | TouchEvent<HTMLElement>) => {
      if (e.detail > 1) return; // Prevent opening form on double click

      openEventForm();
    },
    [openEventForm],
  );

  return (
    <DraftContextV2.Provider
      value={{
        draft,
        setDraft,
        openEventForm: openForm,
        closeEventForm,
        onDelete,
        onSave,
      }}
    >
      {children}
    </DraftContextV2.Provider>
  );
}
