import { connect } from 'react-redux';
import { Dispatch } from 'redux';

import { selectEventIdsBySectionType } from '@ducks/events/selectors';
import { RootState } from '@store';
import {
  getCurrentMonthEventsSlice,
  getFutureEventsSlice,
} from '@ducks/events/slice';
import {
  GetPaginatedEventsPayload,
  SideBarSectionType,
} from '@ducks/events/types';
import { Priorities } from '@common/types/entities';

import { EventsList } from '../components/Sidebar/EventsList';

export const sidebarEventsContainerFabric = (
  sectionType: SideBarSectionType
) => {
  const getEvents = (dispatch: Dispatch, params: GetPaginatedEventsPayload) => {
    const actionBySectionType = {
      currentMonth: getCurrentMonthEventsSlice.actions.request,
      future: getFutureEventsSlice.actions.request,
    };

    dispatch(actionBySectionType[sectionType](params));
  };

  const mapStateToProps = (state: RootState) => ({
    eventIds: selectEventIdsBySectionType(state, sectionType),
  });

  const mapDispatchToProps = (
    dispatch: Dispatch,
    {
      offset,
      priorities,
      pageSize,
    }: {
      offset: number;
      pageSize: number;
      priorities: Priorities[];
      sectionType: SideBarSectionType;
    }
  ) => ({
    getEvents: () => getEvents(dispatch, { offset, pageSize, priorities }),
  });
  return connect(mapStateToProps, mapDispatchToProps)(EventsList);
};
