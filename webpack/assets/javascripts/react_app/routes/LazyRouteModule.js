import React from 'react';
import PropTypes from 'prop-types';
import LoadingPage from './common/LoadingPage';
import LazyModule from '../components/common/LazyComponent/LazyModule';

const findRoute = (module, path) => {
  const exported = module.default || module;
  if (Array.isArray(exported)) {
    return exported.find(route => route.path === path);
  }
  return exported;
};

const LazyRouteModule = ({ loader, path, routeProps }) => (
  <LazyModule loader={loader} fallback={<LoadingPage />}>
    {module => {
      const route = findRoute(module, path);
      if (!route || typeof route.render !== 'function') {
        throw new Error(`No lazy route is defined for ${path}`);
      }
      return route.render(routeProps);
    }}
  </LazyModule>
);

LazyRouteModule.propTypes = {
  loader: PropTypes.func.isRequired,
  path: PropTypes.string.isRequired,
  routeProps: PropTypes.object.isRequired,
};

export default LazyRouteModule;
