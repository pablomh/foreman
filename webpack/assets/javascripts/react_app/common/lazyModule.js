// Loaders are cache keys: pass module-scope functions, not inline arrows.
const cache = new Map();

export const loadModule = loader => {
  const cached = cache.get(loader);
  if (cached) return cached.promise;

  let loaded;
  try {
    loaded = Promise.resolve(loader());
  } catch (error) {
    return Promise.reject(error);
  }

  const entry = {};
  entry.promise = (async () => {
    try {
      const module = await loaded;
      entry.module = module;
      return module;
    } catch (error) {
      cache.delete(loader);
      throw error;
    }
  })();
  cache.set(loader, entry);
  return entry.promise;
};

export const cachedModule = loader => {
  const cached = cache.get(loader);
  return {
    module: cached && cached.module,
    settled: !!cached && 'module' in cached,
  };
};
