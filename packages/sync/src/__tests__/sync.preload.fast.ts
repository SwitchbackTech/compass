// Fast tier: env only. Non-db sync tests never connect to Mongo.
process.env["NODE_ENV"] = "test";
process.env["LOG_LEVEL"] = "debug";
