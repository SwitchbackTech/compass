# Development Quickstart

## Get code and dependencies

```bash
git clone git@github.com:SwitchbackTech/compass.git
cd compass
bun install
```

## Run the web app

```bash
bun run dev:web
```

The frontend runs at <http://localhost:9080>.

## Backend and config

Most frontend work does not need backend services. For backend, auth, MongoDB,
Google sync, SSE, or CLI work, see [Local Development](./local-development.md).

For test commands and expectations, see the
[Testing Playbook](./testing-playbook.md).
