const shell = require("shelljs");
const dotenv = require("dotenv");
const path = require("path");

const envPath = path.join(__dirname, "..", "..", "..", "backend", ".env");
dotenv.config({ path: envPath });

const clientId = process.env.CLIENT_ID;
const port = process.env.PORT;
const baseUrl = process.env.BASEURL || `http://localhost:${port}/api`;

const devWeb = () => {
  shell.exec(
    `cd packages/web && yarn webpack serve --mode=development --env API_BASEURL=${baseUrl} API_PORT=${port} IS_DEV=true GOOGLE_CLIENT_ID=${clientId}`
  );
};

devWeb();
