const presets = require('./presets');

module.exports = api => ({
  presets: presets(
    api.caller(caller => !!(caller && caller.supportsStaticESM))
  ),
});
