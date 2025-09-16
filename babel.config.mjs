// babel.config.js
export default {
  presets: [
    ['@babel/preset-env', {
      bugfixes: true
    }]
  ],
  plugins: [
    '@babel/plugin-proposal-numeric-separator',
    '@babel/plugin-transform-class-properties',
    '@babel/plugin-transform-class-static-block',
    '@babel/plugin-transform-logical-assignment-operators',
    '@babel/plugin-transform-nullish-coalescing-operator',
    '@babel/plugin-transform-optional-catch-binding',
    '@babel/plugin-transform-optional-chaining',
    '@babel/plugin-transform-runtime',
    '@babel/plugin-transform-typescript',
  ]
};
