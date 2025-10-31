const shell = require("shelljs");

const devWeb = () => {
  shell.exec(
    `cd packages/web && yarn webpack serve --mode=development --node-env=local`,
  );
};

devWeb();
