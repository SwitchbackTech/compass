import {
  Dispatch,
  PropsWithChildren,
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
  openEventForm: (create?: boolean) => void;
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

  return (
    <DraftContextV2.Provider
      value={{
        draft,
        setDraft,
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
