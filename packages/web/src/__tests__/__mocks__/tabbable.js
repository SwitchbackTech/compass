const lib = jest.requireActual("tabbable");

/*
Mocks the 'tabbable' library, used by focus-trap

https://github.com/focus-trap/tabbable 

https://stackoverflow.com/questions/72762696/jest-error-your-focus-trap-must-have-at-least-one-container-with-at-least-one
*/
const tabbable = {
  ...lib,
  tabbable: (node, options) =>
    lib.tabbable(node, {
      ...options,
      displayCheck: "none",
    }),
  focusable: (node, options) =>
    lib.focusable(node, {
      ...options,
      displayCheck: "none",
    }),
  isFocusable: (node, options) =>
    lib.isFocusable(node, {
      ...options,
      displayCheck: "none",
    }),
  isTabbable: (node, options) =>
    lib.isTabbable(node, {
      ...options,
      displayCheck: "none",
    }),
};

module.exports = tabbable;
