import { useEffect, useState } from 'react';

const pending = new Map();
const resolved = new Map();

export const loadModule = loader => {
  if (resolved.has(loader)) return Promise.resolve(resolved.get(loader));
  if (!pending.has(loader)) {
    pending.set(
      loader,
      (async () => {
        try {
          const module = await loader();
          resolved.set(loader, module);
          return module;
        } finally {
          pending.delete(loader);
        }
      })()
    );
  }
  return pending.get(loader);
};

const useLazyModule = loader => {
  const [module, setModule] = useState(() => resolved.get(loader));
  const [failure, setFailure] = useState(null);

  useEffect(() => {
    if (module) return undefined;
    let active = true;
    (async () => {
      try {
        const loaded = await loadModule(loader);
        if (active) setModule(loaded);
      } catch (error) {
        if (active) setFailure({ loader, error });
      }
    })();
    return () => {
      active = false;
    };
  }, [loader, module]);

  if (failure && failure.loader === loader) throw failure.error;

  return module;
};

export default useLazyModule;
