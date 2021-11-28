import { connect } from 'react-redux';

import { selectEventById } from '@ducks/events/selectors';
import { RootState } from '@store';

import { Event } from '../components/Sidebar/EventsList/Event';

const mapStateToProps = (state: RootState, { id }: { id: string }) => ({
  event: selectEventById(state, id),
});

export const SidebarEventContainer = connect(mapStateToProps)(Event);
