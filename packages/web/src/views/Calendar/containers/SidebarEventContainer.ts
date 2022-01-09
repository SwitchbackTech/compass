import { connect } from "react-redux";

import { selectEventById } from "@web/ducks/events/selectors";
import { RootState } from "@web/store";

import { Event } from "../components/Sidebar/EventsList/Event";

const mapStateToProps = (state: RootState, { id }: { id: string }) => ({
  event: selectEventById(state, id),
});

export const SidebarEventContainer = connect(mapStateToProps)(Event);
