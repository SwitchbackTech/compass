# Development Quickstart

## Get code and dependencies

```bash
git clone git@github.com:SwitchbackTech/compass.git

cd compass

bun install

## Setup config values

```bash
cp compass.example.yaml compass.yaml
```

Replace the placeholder values in `compass.yaml`

## Run

Run the web app in one terminal:

```bash
bun run dev:web
# Frontend on <http://localhost:9080>
```

Run the backend in another terminal:

```bash
bun run dev:backend  
# Backend on <http://localhost:3000>
```

## Testing

After making your changes, you can run our test suite locally before opening a PR.

```bash
bun run test:core && bun run test:web && bun run test:backend
bun run test:e2e
```
