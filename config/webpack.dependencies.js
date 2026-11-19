/* eslint-disable */

const packageJson = require('../package.json');

const allDependencies = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
};

// Modules loaded eagerly into the vendor entry, in addition to the shared scope.
const vendorEntry = [
  'intl',
  /**
   * React related
   */
  '@apollo/client',
  '@apollo/client/link/batch-http',
  '@reduxjs/toolkit',
  'core-js/shim',
  'regenerator-runtime/runtime',
  'formik',
  'react',
  'react-dom',
  'react-dnd',
  'react-dnd-html5-backend',
  'react-diff-view',
  'react-onclickoutside',
  'react-router-dom',
  'react-router-bootstrap',
  'react-loading-skeleton',
  'react-redux',
  'redux',
  'redux-logger',
  'redux-thunk',
  'reselect',
  'prop-types',
  'classnames',
  'seamless-immutable',
  'connected-react-router',
  'react-helmet',
  'react-intl',

  /**
   * Patternfly related
   */
  'patternfly-react',
  '@patternfly/react-core',
  '@patternfly/react-icons',
  '@patternfly/react-table',
  '@patternfly/react-tokens',
  '@patternfly/react-styles',
  '@patternfly/react-templates',

  /**
   * UUID
   */
  'uuid',
  'uuid/v1',
  'uuid/v3',
  'uuid/v4',
  'uuid/v5',

  'jstz',
  'diff',

  /**
   * Other packages
   */
  'history',
  'number_helpers',
  'lodash',
  'axios',
  'file-saver',
  'humanize-duration',
  'unidiff',
  'urijs',
  'yup',
  'select2',
  'multiselect',
  'sanitize-html',

  /*
   * for rh_cloud
   * /index is a workaround until we find a better way
  */
  'unleash-proxy-client',
  '@unleash/proxy-client-react',
  '@scalprum/core/index',
  '@scalprum/react-core/index',
];

// Shared modules the plugin scope may provide lazily. A package listed here
// must not be imported synchronously by core exports or plugin entries.
const nonEager = [
  '@novnc/novnc',
  '@spice-project/spice-html5',
  'react-password-strength',
  'ace-builds',
  'react-ace',
];

const packageName = request =>
  request.startsWith('@')
    ? request.split('/').slice(0, 2).join('/')
    : request.split('/')[0];

const unique = values => [...new Set(values)];

const unknown = unique(
  [...vendorEntry, ...nonEager]
    .map(packageName)
    .filter(name => !allDependencies[name])
);
if (unknown.length) {
  throw new Error(
    `webpack dependency lists reference unknown packages: ${unknown.join(', ')}`
  );
}

const conflicting = unique(
  vendorEntry.map(packageName).filter(name => nonEager.includes(name))
);
if (conflicting.length) {
  throw new Error(
    `packages cannot be both vendor entries and non-eager: ${conflicting.join(', ')}`
  );
}

module.exports = { vendorEntry, nonEager };
