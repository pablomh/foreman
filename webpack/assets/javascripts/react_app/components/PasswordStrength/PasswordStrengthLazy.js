import React from 'react';
import LazyComponent from '../common/LazyComponent';

const loader = () => import('./index');

const PasswordStrengthLazy = props => (
  <LazyComponent loader={loader} {...props} />
);

export default PasswordStrengthLazy;
