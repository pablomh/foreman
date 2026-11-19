import React, { Suspense } from 'react';
import { Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { routes } from './routes';
import { renderRoute } from './RoutingService';
import ForemanSwitcher from './ForemanSwitcher';
import LoadingPage from './common/LoadingPage';

const AppSwitcher = ({ children }) => (
  <>
    <ForemanSwitcher>
      <Suspense fallback={<LoadingPage />}>
        {routes.map(({ render, path, ...routeProps }) => (
          <Route
            path={path}
            key={path}
            {...routeProps}
            render={renderProps => renderRoute(render, renderProps)}
          />
        ))}
      </Suspense>
    </ForemanSwitcher>
    {children}
  </>
);

AppSwitcher.propTypes = {
  children: PropTypes.object,
};

AppSwitcher.defaultProps = {
  children: null,
};

export default AppSwitcher;
