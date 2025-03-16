import { server } from './mocks/server';
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set default test environment variables
process.env.MONGO_URI = 'mongodb://localhost:27017/test';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
  // Download MongoDB binary during setup to avoid doing it for each test
  // await MongoMemoryServer.create({
  //   binary: {
  //     version: '6.0.14',
  //     downloadDir:
  //       'node_modules/.cache/mongodb-memory-server/mongodb-binaries',
  //   },
  // });
});

afterAll(() => {
  server.close();
});

afterEach(() => {
  server.resetHandlers();
});
