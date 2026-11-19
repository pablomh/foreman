import React from 'react';
import EmptyPage from './common/EmptyPage/route';
import LazyRouteModule from './LazyRouteModule';
import { AUDITS_PATH } from './Audits/constants';
import {
  MODELS_PATH,
  MODELS_PATH_NEW,
  MODELS_PATH_BY_ID,
  MODELS_PATH_EDIT,
} from './Models/constants';
import { HOSTS_PATH } from './Hosts/constants';
import { HOST_DETAILS_PATH } from './HostDetails/constants';
import { REGISTRATION_PATH } from './RegistrationCommands/constants';
import { HOST_STATUSES_PATH } from './HostStatuses/constants';
import { FILTERS_PATH_NEW, FILTERS_PATH_EDIT } from './FiltersForm/constants';
import { UPGRADE_PATH } from './Upgrade/constants';

const lazyRoute = (path, loader, extra = {}) => ({
  path,
  render: props => (
    <LazyRouteModule loader={loader} path={path} routeProps={props} />
  ),
  ...extra,
});

const loadAudits = () => import('./Audits');
const loadModels = () => import('./Models');
const loadHosts = () => import('./Hosts');
const loadHostDetails = () => import('./HostDetails');
const loadRegistrationCommands = () => import('./RegistrationCommands');
const loadHostStatuses = () => import('./HostStatuses');
const loadFiltersForm = () => import('./FiltersForm');
const loadUpgrade = () => import('./Upgrade');

export const routes = [
  lazyRoute(AUDITS_PATH, loadAudits),
  lazyRoute(MODELS_PATH, loadModels, { exact: true }),
  lazyRoute(MODELS_PATH_NEW, loadModels, { exact: true }),
  lazyRoute(MODELS_PATH_EDIT, loadModels, { exact: true }),
  lazyRoute(MODELS_PATH_BY_ID, loadModels, { exact: true }),
  lazyRoute(HOSTS_PATH, loadHosts, { exact: true }),
  lazyRoute(HOST_DETAILS_PATH, loadHostDetails),
  lazyRoute(REGISTRATION_PATH, loadRegistrationCommands, { exact: true }),
  lazyRoute(HOST_STATUSES_PATH, loadHostStatuses),
  EmptyPage,
  lazyRoute(FILTERS_PATH_NEW, loadFiltersForm, { exact: true }),
  lazyRoute(FILTERS_PATH_EDIT, loadFiltersForm, { exact: true }),
  lazyRoute(UPGRADE_PATH, loadUpgrade, { exact: true }),
];
