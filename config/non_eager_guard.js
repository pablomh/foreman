const { WebpackError } = require('webpack');
const { nonEager, packageName } = require('./webpack.dependencies');

const nonEagerPackages = new Set(nonEager);

const dependenciesOf = module =>
  [module, ...(module.modules || [])].flatMap(item => item.dependencies || []);

module.exports = {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap('NonEagerGuard', compilation => {
      compilation.hooks.afterOptimizeChunks.tap('NonEagerGuard', chunks => {
        const offenders = new Set();
        Array.from(chunks)
          .filter(chunk => chunk.canBeInitial())
          .forEach(chunk => {
            Array.from(
              compilation.chunkGraph.getChunkModulesIterable(chunk)
            ).forEach(webpackModule => {
              dependenciesOf(webpackModule).forEach(dependency => {
                if (!dependency.request) return;
                const name = packageName(dependency.request);
                if (nonEagerPackages.has(name)) {
                  offenders.add(
                    `${name} (imported by ${webpackModule.identifier()})`
                  );
                }
              });
            });
          });
        if (offenders.size) {
          compilation.errors.push(
            new WebpackError(
              `non-eager shared packages imported by initial chunks: ${[
                ...offenders,
              ].join(', ')}`
            )
          );
        }
      });
    });
  },
};
