import { connect } from "react-redux";
import { selectEventById } from "@web/ducks/events/event.selectors";
import { RootState } from "@web/store";

import { DraggableSomedayEvent } from "../../components/Sidebar/EventsList/SomedayEvent/DraggableSomedayEvent";

const mapStateToProps = (state: RootState, { _id }: { _id: string }) => ({
  event: selectEventById(state, _id),
});

export const SomedayEventContainer = connect(mapStateToProps)(
  DraggableSomedayEvent
);
