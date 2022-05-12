# Compass Calendar

## Dev Setup

<br>

Clone the repo and install dependencies:

```bash
git clone { repo URL }
cd compass-calendar
```

### Install dependencies

```bash
yarn
```

optional: build entire project to make future incremental builds faster:

```bash
yarn build
```

### Setup the `.env` file

- If you haven't received it already, ask Ty for it
- Save the `.env` to `packages/backend` directory
- Reminders:
  1. never commit this file to GitHub
  2. never share any of its contents with anyone outside of Switchback
  3. never make a copy of this file and store it on an insecure channel (eg Discord, email, Google Drive)
  4. never make the contents of the file accessible. For example, don't create a `/app/api/.env` route that you users can make GET requests on

### Start app

```bash
yarn dev:backend    # start API backend in dev mode
yarn dev:web # start web  app in dev mode

# go to the app/address listed from the command output to access the app
```

### Setup Postman (optional)

Authenticate Postman with your Compass user:

- Authenticate to compass
- Copy the `token` local storage value
- Download Postman
- Click on the `compass-calendar-vx` collection
- Click `Authorization`
- Specify `Bearer Token`
- Paste the token value into the Token field
- Save
- Your user token should now be used for all Postman requests

Open up one of the requests and test it out, referencing the example requests as-needed.

### Other useful scripts

- see `package.json` scripts for all scripts

```bash
yarn test # runs all tests
yarn test:web  # runs tests for the 'web' package
```

### Setup IDE Tools (optional)

Install these IDE extensions:

- ESLint
- Prettier
- Jest Runner
- vs-code-styled-components

### Familiarize yourself with our testing stack:

Note: Check-in with Ty to determine how much testing is needed for the project in its current state.

- [Jest](https://jestjs.io/): test runner & unit tests
- [React-Testing-Library](https://testing-library.com/docs/react-testing-library/intro): DOM testing
- [jest-styled-components:](https://github.com/styled-components/jest-styled-components#react-testing-library) `styled-components` testing
- [@shelf/jest-mongodb](https://github.com/shelfio/jest-mongodb): Jest preset for an in-memory MongoDB server, which is used for integration tests

If/when electron is supported, these will (probably) be added:

- [Spectron](https://www.electronjs.org/spectron): Integration & accessibility tests for Electron apps, using Chrome's accessibility tools
- [electronegativity](https://github.com/doyensec/electronegativity#electronegativity): security audits for electron

## References

Refer to the `/docs` folder for more technical context
