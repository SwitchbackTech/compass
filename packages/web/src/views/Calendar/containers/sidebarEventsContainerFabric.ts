import { connect } from "react-redux";
import { Dispatch } from "redux";
import { Priorities } from "@core/core.constants";
import { selectEventIdsBySectionType } from "@web/ducks/events/selectors";
import { RootState } from "@web/store";
import {
  getCurrentMonthEventsSlice,
  getFutureEventsSlice,
} from "@web/ducks/events/slice";
import {
  Payload_GetPaginatedEvents,
  SectionType_Sidebar,
} from "@web/ducks/events/types";
import { EventsList } from "@web/views/Calendar/components/Sidebar/EventsList";

export const sidebarEventsContainerFabric = (
  sectionType: SectionType_Sidebar
) => {
  const getEvents = (
    dispatch: Dispatch,
    params: Payload_GetPaginatedEvents
  ) => {
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
      sectionType: SectionType_Sidebar;
    }
  ) => ({
    getEvents: () => getEvents(dispatch, { offset, pageSize, priorities }),
  });
  return connect(mapStateToProps, mapDispatchToProps)(EventsList);
};
