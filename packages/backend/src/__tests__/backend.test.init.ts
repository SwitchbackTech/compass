process.env["BASEURL"] = "https://foo.yourdomain.app";
process.env["CORS"] =
  "https://foo.yourdomain.app,http://localhost:3000,http://localhost:9080";
process.env["PORT"] = "3000";
process.env["MONGO_URI"] = process.env["MONGO_URL"];
process.env["DB"] = "test-db";
process.env["CLIENT_ID"] = "googleClientId";
process.env["CLIENT_SECRET"] = "googleSecret";
process.env["CHANNEL_EXPIRATION_MIN"] = "5";
process.env["SUPERTOKENS_URI"] = "http://localhost:3000";
process.env["SUPERTOKENS_KEY"] = "sTKey";
process.env["EMAILER_API_SECRET"] = "emailerApiSecret";
process.env["EMAILER_WAITLIST_TAG_ID"] = "1234567";
process.env["EMAILER_WAITLIST_INVITE_TAG_ID"] = "7654321";
process.env["EMAILER_USER_TAG_ID"] = "910111213";
process.env["TOKEN_GCAL_NOTIFICATION"] = "secretToken1";
process.env["TOKEN_COMPASS_SYNC"] = "secretToken2";
