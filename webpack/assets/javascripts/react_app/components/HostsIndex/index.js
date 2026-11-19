import { createContext } from 'react';
import forceSingleton from '../../common/forceSingleton';
import { lazyComponent } from '../common/LazyComponent';

export const ForemanHostsIndexActionsBarContext = forceSingleton(
  'ForemanHostsIndexActionsBarContext',
  () => createContext({})
);

export const getScheduleJobSearch = ({
  selectedCount,
  areAllRowsSelected,
  selectedHostsSearch,
}) => {
  if (selectedCount === 0) return null;
  if (areAllRowsSelected && selectedHostsSearch === '') return 'name ~ *';
  return selectedHostsSearch;
};

export default lazyComponent(() => import('./HostsIndexPage'), 'HostsIndex');
