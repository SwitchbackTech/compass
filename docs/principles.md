# Engineering Principles

These are high-level principles.
For specific guidance, see [AGENTS.md](../AGENTS.md).

## As simple as possible

- Remove more than you add. Before adding new code to solve a problem, consider whether removing code would do the job
- Prefer simple abstractions over complex ones
- Prefer language built-ins over libraries (example: es6 > lodash)
- Minimize dependencies

## Do one thing

- Every function, class, or service should do one thing. It should have one responsibility. Once it starts doing multiple things, split it up.
