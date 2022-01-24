Here's how this repo handles logging

Compass backend logging: `winston`

- the general purpose logger for production & development

HTTP Middleware: `express-winson`

- for production & development

Fancy console.logs: `debug`

- debug is like an augmented version of console.log, but unlike console.log, you don’t have to comment out debug logs in production code. Logging is turned off by default and can be conditionally turned on by using the DEBUG environment variable.
