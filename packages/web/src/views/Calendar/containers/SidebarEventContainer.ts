import { connect } from "react-redux";
import { selectEventById } from "@web/ducks/events/selectors";
import { RootState } from "@web/store";

// $$
import { SomedayEvent } from "../components/Sidebar/EventsList/SomedayEvent";
import { DraggableSomedayEvent } from "../components/Sidebar/EventsList/SomedayEvent/DraggableSomedayEvent";

const mapStateToProps = (state: RootState, { _id }: { _id: string }) => ({
  event: selectEventById(state, _id),
});

export const SidebarEventContainer = connect(mapStateToProps)(
  DraggableSomedayEvent
);
// export const SidebarEventContainer = connect(mapStateToProps)(SomedayEvent);
