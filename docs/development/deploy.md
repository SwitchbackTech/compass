# Deploy

## Domain & Instances

In order to allow users to sign-in and sync their Google Calendars, you'll need access to a server that has a domain name and is accessible over HTTPS.

Then you'll need to update a few configuration values:

1. Put your runtime values in `packages/backend/.env.production` for production or `packages/backend/.env.staging` for staging.
2. Set `BASEURL` to your public API base URL, including `/api`.
3. Set `PROD_WEB_URL` or `STAGING_WEB_URL` to the public web app URL for that environment.
4. Add the deployed web URL to the `CORS` list in the matching env file.
5. Add your deployed web origin and redirect URIs to your Google Cloud project.

## Web

The [build CLI for web](./build) compiles the frontend code into JS and static assets. It's up to you to decide how to serve these files to your users.

We use a Nginx reverse proxy to serve the static assets and handle SSL. This requires more manual server configuration compared to a PaaS like Vercel or Heroku.

## Backend (API)

After running [the build CLI for the backend](./build), the compiled backend is written to `/build/node` and includes the selected environment file as `/build/node/.env`. You can copy that directory to your server and run the API like a normal Node app with `node build/node/packages/backend/src/app.js`. Similar to the web app, it's up to you to decide how to configure your Node server. You could turn it into a container and deploy it on a PaaS. Or you could run it in a VM on a cloud provider and use a tool like `pm2` to manage it. Depending on the PaaS you choose, you might need to configure the webserver to support WebSocket connections over a reverse proxy.

Getting the backend production-ready can be a headache. If you'd like to get up-and-running quickly and want it done right, ask about our white-glove install service.

## Desktop

We originally built Compass as an Electron app. However, we quickly shifted to distributing it as a web app, because it's easier to deploy and test.

The code in [`packages/electron` from this commit](https://github.com/SwitchbackTech/compass/commit/506c87d3dc05fed83d9a5b714fc4a637152c3bbe) comes from those early desktop days. It's probably broken, but it might be helpful to reference if you're keen to pick up where I left off. The structure is based on [this template](https://github.com/reZach/secure-electron-template).
