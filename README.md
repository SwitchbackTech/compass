# Compass Calendar

## Dev Setup

<br>

Clone the repo via git and install dependencies:

```bash
git clone {repo URL}
cd {repo name}
```

### Install dependencies & run

```bash
yarn
cd packages/web
yarn start
```

### Setup Styling IDE Tools (optional)

We use tooling to enforce style consistency (currently ESLint + Prettier).

Install those IDE plugins (optional)

### Familiarize yourself with our testing stack:

Note: Check-in with Ty to determine how much testing is needed for the project in its current state.

- [Jest](https://jestjs.io/): test runner & unit tests
- [React-Testing-Library](https://testing-library.com/docs/react-testing-library/intro): DOM testing
- [jest-styled-components:](https://github.com/styled-components/jest-styled-components#react-testing-library) `styled-components` testing

Once electron is supported, these will (probably) be added:

- [Spectron](https://www.electronjs.org/spectron): Integration & accessibility tests for Electron apps, using Chrome's accessibility tools
- [electronegativity](https://github.com/doyensec/electronegativity#electronegativity): security audits for electron

See `package.json` for testing commands

## References

Refer to the `/docs` folder for more technical context
