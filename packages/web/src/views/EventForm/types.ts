import React from 'react';

import { EventEntity, Priorities } from '@common/types/entities';

export interface BasicProps {
  priority?: Priorities;
}

export interface ComponentProps extends BasicProps {
  onClose: () => void;
  onSubmit: (event: EventEntity) => void;
  event?: EventEntity;
  setEvent: React.Dispatch<React.SetStateAction<EventEntity>>;
}

export interface StyledProps extends BasicProps {
  isOpen?: boolean;
}
