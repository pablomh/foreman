import React from 'react';
import { Redirect } from 'react-router-dom';

import ModelsPage from './ModelsPage';
import NewModelFormPage from './NewModelFormPage';
import EditModelFormPage from './EditModelFormPage';
import {
  MODELS_PATH,
  MODELS_PATH_NEW,
  MODELS_PATH_BY_ID,
  MODELS_PATH_EDIT,
} from './constants';

export default [
  {
    path: MODELS_PATH,
    render: props => <ModelsPage {...props} />,
  },
  {
    path: MODELS_PATH_NEW,
    render: props => <NewModelFormPage {...props} />,
  },
  {
    path: MODELS_PATH_EDIT,
    render: props => <EditModelFormPage {...props} />,
  },
  {
    path: MODELS_PATH_BY_ID,
    render: ({ match, location }) => (
      <Redirect
        to={{
          pathname: `${MODELS_PATH}/${match.params.id}/edit`,
          search: location.search,
        }}
      />
    ),
  },
];
