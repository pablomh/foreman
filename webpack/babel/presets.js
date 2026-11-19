// Webpack (babel-loader) supports static ESM; Jest does not.
const presets = supportsStaticESM => [
  [
    require.resolve('@babel/preset-env'),
    { modules: supportsStaticESM ? false : 'commonjs' },
  ],
  require.resolve('@babel/preset-react'),
];

module.exports = presets;
