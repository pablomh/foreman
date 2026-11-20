import React from 'react';
import LazyComponent from './LazyComponent';

const lazyComponent = (loader, displayName) => {
  const Component = props => <LazyComponent loader={loader} {...props} />;
  Component.displayName = displayName || 'LazyComponent';
  return Component;
};

export default lazyComponent;
