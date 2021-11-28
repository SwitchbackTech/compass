// based on: https://jestjs.io/docs/getting-started
module.exports = {
  presets: [
  ['@babel/preset-env', {targets: {node: 'current'}}],
  '@babel/preset-typescript',
  '@babel/preset-react'
]
};