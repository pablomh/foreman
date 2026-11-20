import React from 'react';
import PropTypes from 'prop-types';
import { Spinner } from '@patternfly/react-core';
import LazyModule from './LazyModule';

const LazyComponent = ({ loader, ...props }) => (
  <LazyModule
    loader={loader}
    fallback={
      <div className="lazy-component-loading">
        <Spinner size="lg" aria-label="Loading" />
      </div>
    }
  >
    {module => {
      const Component = module.default || module;
      return <Component {...props} />;
    }}
  </LazyModule>
);

LazyComponent.propTypes = {
  loader: PropTypes.func.isRequired,
};

export default LazyComponent;
