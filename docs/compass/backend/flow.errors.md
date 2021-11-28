## How the backend handles errors

All errors should bubble up to our app's custom base error handler, where the error is logged and acted upon, depending on whether its programmer or operational (see definitions below)

Errors that occur during Express calls:

- Error is caught by our custom express error handler middleware
- That middleware calls the base error handler, which decides how to handle

## Error types

**Operational errors:**

Expected runtime problems that should be dealt with. They're not bugs in this code, but they still need to handled thoughtfully.

Examples:

- Out of memory error: catch, log
- Client sends invalid API request:

**Programmer errors:**

Unexpected bugs in code. The code itself has some issues to solve and was coded wrong. A good example is to try to read a property of “undefined.” To fix the issue, the code has to be changed. That is a bug a developer made, not an operational error.

Best to close app and have it auto-restart (via pm2, eg)

### References

[Guide 1 - Node](https://www.toptal.com/nodejs/node-js-error-handling)
[Guide 2 - Promise-based Error Handling](https://www.toptal.com/express-js/routes-js-promises-error-handling)
[Guide 3](https://www.robinwieruch.de/node-express-error-handling)
[Guide 4](https://expressjs.com/en/guide/error-handling.html)

[List of Best Practices](https://goldbergyoni.com/checklist-best-practices-of-node-js-error-handling/#codesyntax_13)
