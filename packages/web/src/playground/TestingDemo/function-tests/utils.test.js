import { formatUserName } from "./utils";

/* 
Demo tests from:
    https://blog.logrocket.com/testing-apps-with-jest-and-react-testing-library/
*/

describe("utils", () => {
  test("formatUserName adds @ at the beginning of the username", () => {
    expect(formatUserName("jc")).toBe("@jc");
  });

  test("formatUserName does not add @ when it is already provided", () => {
    expect(formatUserName("@jc")).toBe("@jc");
  });
});

/*
jest
 */