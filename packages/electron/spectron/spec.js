/* eslint-disable no-undef */
const Application = require("spectron").Application;
const assert = require("assert");
const electronPath = require("electron");
const path = require("path");

// placeholder test until a real spectron test is added
describe("true is truthy", () => {
  test("true is truthy", () => {
    expect(true).toBe(true);
  });
});

/*
// Sample code taken from:
// https://github.com/electron-userland/spectron
describe('Application launch', function () {
  this.timeout(100000)

  beforeEach(function () {
    this.app = new Application({
      // Your electron path can be any binary
      // i.e for OSX an example path could be '/Applications/MyApp.app/Contents/MacOS/MyApp'
      // But for the sake of the example we fetch it from our node_modules.
      path: electronPath,
      args: [path.join(__dirname, '../app/electron/main.js')]
    })
    return this.app.start()
  })

  afterEach(function () {
    if (this.app && this.app.isRunning()) {
      return this.app.stop()
    }
  })

  it('shows an initial window', function () {
    return this.app.client.getWindowCount().then(function (count) {
      assert.strictEqual(count, 1)
      // Please note that getWindowCount() will return 2 if `dev tools` are opened.
      // assert.equal(count, 2)
    })
  })
})
*/
