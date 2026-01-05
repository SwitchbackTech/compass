/*
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 *
 */

/** @type { Exclude<Exclude<import("jest").Config["projects"], undefined>[number], string>} */
const backendProject = {
  displayName: "backend",
  moduleNameMapper: {
    "^@core(/(.*)$)?": "<rootDir>/packages/core/src/$1",
    "^@backend/auth(/(.*)$)?": "<rootDir>/packages/backend/src/auth/$1",
    "^@backend/calendar(/(.*)$)?": "<rootDir>/packages/backend/src/calendar/$1",
    "^@backend/common(/(.*)$)?": "<rootDir>/packages/backend/src/common/$1",
    "^@backend/dev(/(.*)$)?": "<rootDir>/packages/backend/src/dev/$1",
    "^@backend/email(/(.*)$)?": "<rootDir>/packages/backend/src/email/$1",
    "^@backend/event(/(.*)$)?": "<rootDir>/packages/backend/src/event/$1",
    "^@backend/priority(/(.*)$)?": "<rootDir>/packages/backend/src/priority/$1",
    "^@backend/servers(/(.*)$)?": "<rootDir>/packages/backend/src/servers/$1",
    "^@backend/sync(/(.*)$)?": "<rootDir>/packages/backend/src/sync/$1",
    "^@backend/user(/(.*)$)?": "<rootDir>/packages/backend/src/user/$1",
    "^@backend/waitlist(/(.*)$)?": "<rootDir>/packages/backend/src/waitlist/$1",
    "^@backend/__tests__(/(.*)$)?":
      "<rootDir>/packages/backend/src/__tests__/$1",
  },

  setupFiles: ["<rootDir>/packages/core/src/__tests__/core.test.init.ts"],
  setupFilesAfterEnv: [
    // backend init intentionally here to accommodate @shelf/mongodb preset
    "<rootDir>/packages/backend/src/__tests__/backend.test.init.ts",
    "<rootDir>/packages/backend/src/__tests__/backend.test.start.ts",
  ],
  testMatch: ["<rootDir>/packages/backend/**/?(*.)+(spec|test).[tj]s?(x)"],
  // A preset that is used as a base for Jest's configuration
  preset: "@shelf/jest-mongodb", // https://jestjs.io/docs/mongodb,
};

/** @type { Exclude<Exclude<import("jest").Config["projects"], undefined>[number], string>} */
const coreProject = {
  displayName: "core",
  moduleNameMapper: {
    "^@core(/(.*)$)?": "<rootDir>/packages/core/src/$1",
  },
  testEnvironment: "node",
  testMatch: ["<rootDir>/packages/core/**/?(*.)+(spec|test).[tj]s?(x)"],
  setupFiles: ["<rootDir>/packages/core/src/__tests__/core.test.init.ts"],
  setupFilesAfterEnv: [
    "<rootDir>/packages/core/src/__tests__/core.test.start.ts",
  ],
};

/** @type { Exclude<Exclude<import("jest").Config["projects"], undefined>[number], string>} */
const webProject = {
  displayName: "web",
  moduleNameMapper: {
    "\\.(jpg|jpeg|png|gif)$":
      "<rootDir>/packages/web/src/__tests__/__mocks__/file.stub.js",
    "^@core(/(.*)$)?": "<rootDir>/packages/core/src/$1",
    "^@web/__tests__(/(.*)$)?": "<rootDir>/packages/web/src/__tests__/$1",
    "^@web/assets(/(.*)$)?": "<rootDir>/packages/web/src/assets/$1",
    "^@web/auth(/(.*)$)?": "<rootDir>/packages/web/src/auth/$1",
    "^@web/common(/(.*)$)?": "<rootDir>/packages/web/src/common/$1",
    "^@web/components(/(.*)$)?": "<rootDir>/packages/web/src/components/$1",
    "^@web/ducks(/(.*)$)?": "<rootDir>/packages/web/src/ducks/$1",
    "^@web/public(/(.*)$)?": "<rootDir>/packages/web/src/public/$1",
    "^@web/routers(/(.*)$)?": "<rootDir>/packages/web/src/routers/$1",
    "^@web/socket(/(.*)$)?": "<rootDir>/packages/web/src/socket/$1",
    "^@web/store((/(.*)$)?)?": "<rootDir>/packages/web/src/store/$1",
    "^@web/views(/(.*)$)?": "<rootDir>/packages/web/src/views/$1",
    "^.+\\.(css|less)$":
      "<rootDir>/packages/web/src/__tests__/__mocks__/css.stub.js",
    "\\.(svg)$": "<rootDir>/packages/web/src/__tests__/__mocks__/svg.stub.js",
    "^uuid$": "uuid",
  },
  setupFiles: [
    "<rootDir>/packages/core/src/__tests__/core.test.init.ts",
    "<rootDir>/packages/core/src/__tests__/core.test.start.ts",
    "<rootDir>/packages/web/src/__tests__/web.test.init.ts",
    "jest-canvas-mock",
  ],
  setupFilesAfterEnv: [
    "<rootDir>/packages/web/src/__tests__/web.test.start.ts",
  ],
  testEnvironment: "<rootDir>/packages/web/src/__tests__/jsdom.ts",
  testMatch: ["<rootDir>/packages/web/**/*.(test|spec).[jt]s?(x)"],
  transformIgnorePatterns: [
    //https://github.com/react-dnd/react-dnd/issues/3443
    "/node_modules/(?!react-dnd|dnd-core|@react-dnd)",
  ],
};

/** @type { Exclude<Exclude<import("jest").Config["projects"], undefined>[number], string>} */
const scriptsProject = {
  displayName: "scripts",
  moduleNameMapper: {
    ...backendProject.moduleNameMapper,
    "^@scripts(/(.*)$)?": "<rootDir>/packages/scripts/src/$1",
    "^@scripts/commands(/(.*)$)?": "<rootDir>/packages/scripts/src/commands/$1",
    "^@scripts/common(/(.*)$)?": "<rootDir>/packages/scripts/src/common/$1",
    "^@scripts/migrations(/(.*)$)?":
      "<rootDir>/packages/scripts/src/migrations/$1",
    "^@scripts/seeders(/(.*)$)?": "<rootDir>/packages/scripts/src/seeders/$1",
  },
  setupFiles: [...backendProject.setupFiles],
  setupFilesAfterEnv: [...backendProject.setupFilesAfterEnv],
  testMatch: ["<rootDir>/packages/scripts/**/?(*.)+(spec|test).[tj]s?(x)"],
  // A preset that is used as a base for Jest's configuration
  preset: "@shelf/jest-mongodb", // https://jestjs.io/docs/mongodb,
};

const projectMap = {
  core: coreProject,
  web: webProject,
  backend: backendProject,
  scripts: scriptsProject,
};

const requestedProject = process.argv.find((arg) =>
  Object.prototype.hasOwnProperty.call(projectMap, arg),
);

/** @type { import("jest").Config } */
const config = {
  // All imported modules in your tests should be mocked automatically
  // automock: false,

  // Stop running tests after `n` failures
  // bail: 0,

  // The directory where Jest should store its cached dependency information
  // cacheDirectory: "/private/var/folders/2d/c_47t7516j3fmy53gnzf7q780000gn/T/jest_dx",

  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // Indicates whether the coverage information should be collected while executing the test
  // collectCoverage: false,

  // An array of glob patterns indicating a set of files for which coverage information should be collected
  // collectCoverageFrom: undefined,

  // The directory where Jest should output its coverage files
  // coverageDirectory: undefined,

  // An array of regexp pattern strings used to skip coverage collection
  // coveragePathIgnorePatterns: [
  //   "/node_modules/"
  // ],

  // Indicates which provider should be used to instrument code for coverage
  // coverageProvider: "babel",

  // A list of reporter names that Jest uses when writing coverage reports
  // coverageReporters: [
  //   "json",
  //   "text",
  //   "lcov",
  //   "clover"
  // ],

  // An object that configures minimum threshold enforcement for coverage results
  // coverageThreshold: undefined,

  // A path to a custom dependency extractor
  // dependencyExtractor: undefined,

  // Make calling deprecated APIs throw helpful error messages
  // errorOnDeprecated: false,

  // Force coverage collection from ignored files using an array of glob patterns
  // forceCoverageMatch: [],

  // A path to a module which exports an async function that is triggered once before all test suites
  // globalSetup: undefined,

  // A path to a module which exports an async function that is triggered once after all test suites
  // globalTeardown: undefined,

  // A set of global variables that need to be available in all test environments
  // globals: {},

  // The maximum amount of workers used to run your tests. Can be specified as % or a number. E.g. maxWorkers: 10% will use 10% of your CPU amount + 1 as the maximum worker number. maxWorkers: 2 will use a maximum of 2 workers.
  // maxWorkers: "50%",

  // An array of directory names to be searched recursively up from the requiring module's location
  // moduleDirectories: [
  //   "node_modules"
  // ],

  // An array of file extensions your modules use
  // moduleFileExtensions: [
  //   "js",
  //   "jsx",
  //   "ts",
  //   "tsx",
  //   "json",
  //   "node"
  // ],

  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
  // Allows using import aliases
  // moduleNameMapper: {}

  // An array of regexp pattern strings, matched against all module paths before considered 'visible' to the module loader
  modulePathIgnorePatterns: ["<rootDir>/build"],

  // Activates notifications for test results
  // notify: false,

  // An enum that specifies notification mode. Requires { notify: true }
  // notifyMode: "failure-change",

  projects: requestedProject
    ? [projectMap[requestedProject]]
    : [coreProject, webProject, backendProject, scriptsProject],
  // Use this configuration option to add custom reporters to Jest
  // reporters: undefined,

  // Automatically reset mock state between every test
  // resetMocks: false,

  // Reset the module registry before running each individual test
  // resetModules: false,

  // A path to a custom resolver
  // resolver: undefined,

  // Automatically restore mock state between every test
  // restoreMocks: false,

  // The root directory that Jest should scan for tests and modules within
  // rootDir: 'packages/web/',
  // rootDir: 'packages/backend/',
  rootDir: "./",
  passWithNoTests: true,

  // A list of paths to directories that Jest should use to search for files in
  // roots: [
  //   "<rootDir>"
  // ],

  // Allows you to use a custom runner instead of Jest's default test runner
  // runner: "jest-runner",

  // The paths to modules that run some code to configure or set up the testing environment before each test
  // setupFiles: [],

  // A list of paths to modules that run some code to configure or set up the testing framework before each test
  // setupFilesAfterEnv: [],

  // The number of seconds after which a test is considered as slow and reported as such in the results.
  // slowTestThreshold: 5,

  // A list of paths to snapshot serializer modules Jest should use for snapshot testing
  // snapshotSerializers: [],

  // The test environment that will be used for testing
  // testEnvironment: "jsdom",
  // testEnvironment: "node",

  // Options that will be passed to the testEnvironment
  // testEnvironmentOptions: {},

  // Adds a location field to test results
  // testLocationInResults: false,

  // The glob patterns Jest uses to detect test files
  // testMatch: [
  //   "**/__tests__/**/*.[jt]s?(x)",
  //   "**/?(*.)+(spec|test).[tj]s?(x)"
  // ],

  // An array of regexp pattern strings that are matched against all test paths, matched tests are skipped
  // testPathIgnorePatterns: [
  //   "/node_modules/"
  // ],

  // The regexp pattern or array of patterns that Jest uses to detect test files
  // testRegex: [],

  // This option allows the use of a custom results processor
  // testResultsProcessor: undefined,

  // This option allows use of a custom test runner
  // testRunner: "jest-circus/runner",

  // Setting this value to "fake" allows the use of fake timers for functions such as "setTimeout"
  // timers: "real",

  // A map from regular expressions to paths to transformers
  // transform: undefined,

  // An array of regexp pattern strings that are matched against all source file paths, matched files will skip transformation
  // transformIgnorePatterns: [
  //   "/node_modules/",
  //   "\\.pnp\\.[^\\/]+$"
  // ],

  // An array of regexp pattern strings that are matched against all modules before the module loader will automatically return a mock for them
  // unmockedModulePathPatterns: undefined,

  // Indicates whether each individual test should be reported during the run
  // verbose: undefined,

  // An array of regexp patterns that are matched against all source file paths before re-running tests in watch mode
  watchPathIgnorePatterns: ["globalConfig"],

  // Whether to use watchman for file crawling
  // watchman: true,
};

export default config;
