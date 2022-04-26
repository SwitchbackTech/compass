import React, { useEffect, useState, useRef } from "react";
import { Key } from "ts-keycode-enum";
import { useDispatch } from "react-redux";
import { Priority } from "@core/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { StyledEventForm, StyledIconRow } from "@web/views/EventForm/styled";
import { DeleteIcon } from "@web/components/Icons";
import { deleteEventSlice } from "@web/ducks/events/slice";
import { useOnClickOutside } from "@web/common/hooks/useOnClickOutside";

interface BasicProps {
  priority?: Priority;
}

interface Props extends BasicProps {
  event: Schema_Event;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: Schema_Event) => void;
  setEvent: React.Dispatch<React.SetStateAction<Schema_Event>>;
}

interface StyledProps extends BasicProps {
  title?: string;
  isOpen?: boolean;
}
export const SomedayEventForm: React.FC<Props> = ({
  event,
  isOpen,
  onClose: _onClose,
  onSubmit,
  setEvent,
  setIsOpen,
  ...props
}) => {
  const dispatch = useDispatch();
  const testRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const [isModalOpen, setModalOpen] = useState(true);
  useOnClickOutside(formRef, () => setModalOpen(false));

  /*
  useEffect(() => {
    const keyDownHandler = (e: KeyboardEvent) => {
      console.log(e);
      if (e.which === Key.Shift) {
        // toggleShiftKeyPressed(true);
        console.log("shift pressed");
      }

      if (e.which !== Key.Escape) return;

      console.log("escape pressed");
      // setTimeout(onClose);

      elem.addEventListener("keydown", keyDownHandler);

      return () => {
        elem.removeEventListener("keydown", keyDownHandler);
      };
    };
  }, []);
  */

  const onSomedayDelete = () => {
    if (event._id === undefined) {
      return; // assume event was never created
    }
    // setIsOpen(false);
    console.log("reminder: not dispatching delete for now");
    // dispatch(deleteEventSlice.actions.request({ _id: event._id }));
  };

  return (
    <StyledEventForm
      {...props}
      isOpen={true}
      onKeyDown={() => console.log("keyed ")}
      priority={event.priority}
    >
      <StyledIconRow>
        <DeleteIcon onDelete={onSomedayDelete} title="Delete Someday Event" />
      </StyledIconRow>
    </StyledEventForm>
  );
};
