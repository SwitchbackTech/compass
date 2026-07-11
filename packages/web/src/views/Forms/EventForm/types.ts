import { type Ref, type SetStateAction } from "react";
import { type Priority } from "@core/constants/core.constants";
import { type Event } from "@core/types/event.contracts";
import {
  type Categories_Event,
  type Direction_Migrate,
} from "@core/types/event.types";

export interface FormProps {
  event: Event;
  category: Categories_Event;
  isDraft: boolean;
  isExistingEvent: boolean;
  onClose: () => void;
  onCloseEventForm?: () => void;
  onConvert?: () => void;
  onDelete: () => void;
  onDuplicate?: (event: Event) => void;
  onMigrate?: (
    event: Event,
    category: Categories_Event,
    direction: Direction_Migrate,
  ) => void;
  onSubmit: (event: Event | null) => void;
  onSubmitEventForm?: (event: Event) => void;
  priority?: Priority;
  setEvent: (event: SetStateAction<Event | null>) => void;
  titleInputRef?: Ref<HTMLInputElement>;
}

export type SetEventFormField = (
  field: Partial<Pick<Event, "priority">> &
    Partial<{
      title: string;
      description: string;
      schedule: Event["schedule"];
    }>,
  value?: string | Event["priority"],
) => void;
