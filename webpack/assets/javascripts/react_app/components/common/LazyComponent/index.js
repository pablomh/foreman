import React from 'react';
import PropTypes from 'prop-types';
import { Spinner } from '@patternfly/react-core';
import useLazyModule from '../../../common/hooks/useLazyModule';

const LazyComponent = ({ loader, ...props }) => {
  const module = useLazyModule(loader);

  if (!module) {
    return (
      <div className="lazy-component-loading">
        <Spinner size="lg" aria-label="Loading" />
      </div>
    );
  }

  const Component = module.default || module;
  return <Component {...props} />;
};

LazyComponent.propTypes = {
  loader: PropTypes.func.isRequired,
};

export const lazyComponent = (loader, displayName) => {
  const Component = props => <LazyComponent loader={loader} {...props} />;
  Component.displayName = displayName || 'LazyComponent';
  return Component;
};

export default LazyComponent;
