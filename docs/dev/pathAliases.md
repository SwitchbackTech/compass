# Path Aliases

Working with path aliases (`@core/foo` instead of `../../../foo`) has unfortunately required a lot of configuration. This means that if you make changes to the project structure, you'll have to update the configs.

Here's where to look when making project structure changes:

`paths` and `baseUrl` sections of `tsconfig.json`

- for compiling and running in development

`jest.config.js`

- for letting jest know where to look

`resolve.alias` section of Webpack config

- for letting Webpack know where to look
