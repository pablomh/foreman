const modules = process.env.NODE_ENV === 'test' ? 'commonjs' : false;

const presets = [
  [require.resolve('@babel/preset-env'), { modules }],
  require.resolve('@babel/preset-react'),
];

module.exports = presets;
