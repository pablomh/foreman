const { WebpackError } = require('webpack');

const createPluginApiGuard = () => {
  const missingExports = new Set();

  return {
    recordMissingPluginExport(importPath) {
      missingExports.add(importPath);
    },

    apply(compiler) {
      compiler.hooks.thisCompilation.tap('PluginApiGuard', compilation => {
        compilation.hooks.finishModules.tap('PluginApiGuard', () => {
          missingExports.forEach(importPath => {
            compilation.warnings.push(
              new WebpackError(
                `foremanReact${importPath} is not part of the plugin API (config/plugin_api.js); the plugin will receive undefined at runtime`
              )
            );
          });
          missingExports.clear();
        });
      });
    },
  };
};

module.exports = createPluginApiGuard;
