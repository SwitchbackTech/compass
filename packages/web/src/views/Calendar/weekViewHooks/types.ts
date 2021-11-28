import React from 'react';

import { EventEntity } from '@common/types/entities';

export interface WeekViewHelpersProps {
  eventsGridRef: React.RefObject<HTMLDivElement>;
  eventState: EventState | null;
  editingEvent: GridEventEntity | null;

  setEventState: React.Dispatch<React.SetStateAction<EventState | null>>;
  setEditingEvent: React.Dispatch<React.SetStateAction<GridEventEntity | null>>;
  setModifiableDateField: React.Dispatch<
    React.SetStateAction<'startDate' | 'endDate'>
  >;
  onSubmitEvent: (event: EventEntity | GridEventEntity) => void;
}

export interface EventState {
  name: 'rescaling' | 'dragging';
  initialMinutesDifference?: number;
  initialYOffset?: number;
  hasMoved?: boolean;
}

export interface GridEventEntity extends EventEntity {
  isOpen?: boolean;
  isEditing?: boolean;
  importanceIndex?: number;
  siblingsCount?: number;
}
