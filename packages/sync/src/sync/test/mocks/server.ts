import { setupServer } from 'msw/node';
import { gcalHandlers } from './gcal.handlers';

export const server = setupServer(...gcalHandlers);
