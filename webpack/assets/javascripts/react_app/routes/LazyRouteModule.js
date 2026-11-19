import React from 'react';
import PropTypes from 'prop-types';
import LoadingPage from './common/LoadingPage';
import useLazyModule from '../common/hooks/useLazyModule';

const findRoute = (module, path) => {
  const exported = module.default || module;
  if (Array.isArray(exported)) {
    return exported.find(route => route.path === path);
  }
  return exported;
};

const LazyRouteModule = ({ loader, path, routeProps }) => {
  const module = useLazyModule(loader);

  if (!module) {
    return <LoadingPage />;
  }

  const route = findRoute(module, path);
  if (!route || typeof route.render !== 'function') {
    throw new Error(`No lazy route is defined for ${path}`);
  }
  return route.render(routeProps);
};

LazyRouteModule.propTypes = {
  loader: PropTypes.func.isRequired,
  path: PropTypes.string.isRequired,
  routeProps: PropTypes.object.isRequired,
};

export default LazyRouteModule;
