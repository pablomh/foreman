import PropTypes from 'prop-types';
import useLazyModule from '../../../common/hooks/useLazyModule';

// Not React.lazy: componentRegistry mounts have no Suspense ancestor.
const LazyModule = ({ loader, fallback, children }) => {
  const module = useLazyModule(loader);
  return module ? children(module) : fallback;
};

LazyModule.propTypes = {
  loader: PropTypes.func.isRequired,
  fallback: PropTypes.node,
  children: PropTypes.func.isRequired,
};

LazyModule.defaultProps = {
  fallback: null,
};

export default LazyModule;
