import { createContext } from 'react';
import forceSingleton from '../../common/forceSingleton';

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
