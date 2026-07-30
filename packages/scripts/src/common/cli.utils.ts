import { styleText } from "node:util";

export const log = {
  info: (msg: string) => console.log(styleText(["italic", "whiteBright"], msg)),
  error: (msg: string) => console.log(styleText(["bold", "red"], msg)),
  warning: (msg: string) => console.log(styleText("yellow", msg)),
  success: (msg: string) => console.log(styleText("green", msg)),
  tip: (msg: string) => console.log(styleText("yellowBright", msg)),
};
