import { connect } from "react-redux";

import { selectEventById } from "@web/ducks/events/selectors";
import { RootState } from "@web/store";

import { Event } from "../components/Sidebar/EventsList/Event";

// $$ is this the right _id? (or was id right?)
const mapStateToProps = (state: RootState, { _id }: { _id: string }) => ({
  event: selectEventById(state, _id),
});

export const SidebarEventContainer = connect(mapStateToProps)(Event);
