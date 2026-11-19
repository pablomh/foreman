import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Spinner } from '@patternfly/react-core';

const LazyComponent = ({ loader, ...props }) => {
  const [Component, setComponent] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const module = await loader();
      if (active) {
        setComponent(() => module.default || module);
      }
    })();
    return () => {
      active = false;
    };
  }, [loader]);

  if (!Component) {
    return (
      <div className="lazy-component-loading">
        <Spinner size="lg" aria-label="Loading" />
      </div>
    );
  }

  return <Component {...props} />;
};

LazyComponent.propTypes = {
  loader: PropTypes.func.isRequired,
};

export default LazyComponent;
