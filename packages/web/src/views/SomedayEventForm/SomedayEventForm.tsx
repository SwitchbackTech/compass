import React from "react";
import { ComponentProps } from "@web/views/EventForm/types";
import { StyledEventForm, StyledIconRow } from "@web/views/EventForm/styled";
import { DeleteIcon } from "@web/components/Icons";
import { useDispatch } from "react-redux";
import { deleteEventSlice } from "@web/ducks/events/slice";

export const SomedayEventForm: React.FC<ComponentProps> = ({
  onClose: _onClose,
  onDelete,
  onSubmit,
  event,
  setEvent,
  ...props
}) => {
  const { priority, title } = event || {};
  const isFormOpen = true;

  const dispatch = useDispatch();

  const onSomedayDelete = () => {
    if (event._id === undefined) {
      return; // assume event was never created
    }
    dispatch(deleteEventSlice.actions.request({ _id: event._id }));
  };

  return (
    <StyledEventForm {...props} isOpen={isFormOpen} priority={priority}>
      <StyledIconRow>
        <DeleteIcon onDelete={onSomedayDelete} title="Delete Someday Event" />
      </StyledIconRow>
    </StyledEventForm>
  );
};
