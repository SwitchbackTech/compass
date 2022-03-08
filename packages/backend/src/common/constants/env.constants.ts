const _default = {
  scopes: "profile,email,https://www.googleapis.com/auth/calendar",
  port: 3000,
};
const _error = "error!!!";

export const ENV = {
  ACCESS_TOKEN_LIFE: process.env["ACCESS_TOKEN_LIFE"] || _error,
  ACCESS_TOKEN_SECRET: process.env["ACCESS_TOKEN_SECRET"] || _error,
  CLIENT_ID: process.env["CLIENT_ID"] || _error,
  CLIENT_SECRET: process.env["CLIENT_SECRET"] || _error,
  LOG_LEVEL: process.env["LOG_LEVEL"] || "debug",
  PORT: process.env["PORT"] || _default.port,
  BASEURL_PROD: process.env["BASEURL_PROD"] || _error,
  SCOPES: _default.scopes.split(","),
};

if (Object.values(ENV).includes(_error)) {
  console.log(
    `Exiting because a critical env value is missing: ${JSON.stringify(ENV)}`
  );
  process.exit(1);
}
