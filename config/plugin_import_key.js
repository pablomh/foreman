// foremanReact/<path> resolves to a flat key in TheForeman.reactExports:
// drop the leading slash, the optional /index suffix, then join the segments.
const exportKeyFor = request =>
  request
    .replace(/^\//, '')
    .replace(/\/index$/, '')
    .replace(/\//g, '_');

module.exports = { exportKeyFor };
