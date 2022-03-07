#!/usr/bin/env node
var https = require("follow-redirects").https;
var fs = require("fs"),
  readline = require("readline"),
  stream = require("stream");

/*
Parses log file to 
*/

/* setup http server */
var options = {
  method: "POST",
  hostname: "***REMOVED***",
  path: "/api/sync/gcal/notifications/stop",
  headers: {
    Authorization:
      "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2MjIwMmZhZmMzOWJhOTExNzg0ODQ2ZTEiLCJpYXQiOjE2NDYyNzY3NDcsImV4cCI6MTY0NzU3Mjc0N30.EILDzH0MSG7JN8ue_1leG-9JOjuB9gjlA3S6Rqb-1dg",
    "Content-Type": "application/json",
  },
  maxRedirects: 20,
};

var req = https.request(options, function (res) {
  var chunks = [];

  res.on("data", function (chunk) {
    chunks.push(chunk);
  });

  res.on("end", function (chunk) {
    var body = Buffer.concat(chunks);
    console.log(body.toString());
  });

  res.on("error", function (error) {
    console.error(error);
  });
});

/* loop and delete */
var instream = fs.createReadStream("app.log");
var outstream = new stream();
outstream.readable = true;
outstream.writable = true;

var rl = readline.createInterface({
  input: instream,
  output: outstream,
  terminal: false,
});

rl.on("line", function (line) {
  const obj = JSON.parse(line);
  if (obj["namespace"] === "app:sync.service") {
    if (obj["message"].includes("Setting up watch")) {
      const __newChannel = obj["message"].slice(-47);
      //   const newChannel = __newChannel.slice(0, -1);
      console.log("'" + __newChannel);
      /*
      var postData = JSON.stringify({
        channelId: newChannel,
        resourceId: "vLDjaX7kI9LbiqW3M-Op50Mf_kA",
      });
      const out = req.write(postData);
      process.exit();
    }
    */
    }
  }
});

// req.end();
