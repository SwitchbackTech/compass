# Troubleshoot

## Backend Health Check

Before debugging a deeper auth or sync issue, confirm the backend is actually up:

```bash
curl -i http://localhost:3000/api/health
```

Interpret the result like this:

- `200`: the backend is running and can reach MongoDB
- `500`: the backend is running but database connectivity failed
- connection refused or timeout: the backend is not listening yet, or the port/base URL is wrong

## Unable to Sign In with Google in Local Compass Instance

### Missing User id

When you encounter a missing user id, Compass usually is not connected to MongoDB or the backend never started cleanly.

Sometimes MongoDB is successfully connected when you run `yarn dev:backend` but you still get a missing user id error. This could be because:

1. The MongoDB connection string in your backend env file is incorrect
2. Your IP address is not whitelisted in MongoDB Atlas
3. The MongoDB connection string format is invalid or incomplete
4. A required backend env variable is missing, so the server exited during startup

### Mismatch User Id

When you encounter a mismatch user id, the user in your mongo collection is not the one being captured. This could be because you have duplicate users in your database. In order to fix this you need to clear your user data using the CLI delete command:

```bash
yarn cli delete -u <email>
```

See [CLI And Maintenance Commands](./cli-and-maintenance-commands.md) for the current delete flow.

### Invalid domain name

When encountering an invalid domain name error, this is because the URL you provided in the `SUPERTOKENS_..` value in your active environment file is incorrect. For local development that is usually `.env.local`. This could be caused by prematurely finishing the setup of your Supertokens instance.

To fix this:

1. Make sure to completely set up your Supertokens instance
2. Copy the exact connection URI and API key from your Supertokens dashboard
3. Verify the connection URI format matches what Supertokens provides (should include the protocol, domain, and port if applicable)
4. Ensure there are no extra spaces or characters in the environment variable values
