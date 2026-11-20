import { useEffect, useState } from 'react';
import { cachedModule, loadModule } from '../lazyModule';

const useLazyModule = loader => {
  const [loaded, setLoaded] = useState(() => ({
    loader,
    ...cachedModule(loader),
  }));
  const [failure, setFailure] = useState(null);

  useEffect(() => {
    if (loaded.loader === loader && loaded.settled) return undefined;
    let active = true;
    (async () => {
      try {
        const module = await loadModule(loader);
        if (active) setLoaded({ loader, module, settled: true });
      } catch (error) {
        if (active) setFailure({ loader, error });
      }
    })();
    return () => {
      active = false;
    };
  }, [loader, loaded]);

  if (failure && failure.loader === loader) throw failure.error;

  return loaded.loader === loader ? loaded.module : undefined;
};

export default useLazyModule;
