import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import LoadingPage from './common/LoadingPage';

const findRoute = (module, path) => {
  const exported = module.default || module;
  if (Array.isArray(exported)) {
    return exported.find(route => route.path === path);
  }
  return exported;
};

const LazyRouteModule = ({ loader, path, routeProps }) => {
  const [route, setRoute] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const module = await loader();
      if (active) {
        setRoute(findRoute(module, path));
      }
    })();
    return () => {
      active = false;
    };
  }, [loader, path]);

  if (!route) {
    return <LoadingPage />;
  }

  return route.render(routeProps);
};

LazyRouteModule.propTypes = {
  loader: PropTypes.func.isRequired,
  path: PropTypes.string.isRequired,
  routeProps: PropTypes.object.isRequired,
};

export default LazyRouteModule;
