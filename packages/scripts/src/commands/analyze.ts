import shell from "shelljs";

import { COMPASS_ROOT_DEV } from "../common/cli.constants";

export const analyzeWeb = () => {
  shell.cd(`${COMPASS_ROOT_DEV}/packages/web`);
  shell.exec("webpack --env production --mode=production analyze");
};
