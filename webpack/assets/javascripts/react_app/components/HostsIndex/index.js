import { lazyComponent } from '../common/LazyComponent';

export {
  ForemanHostsIndexActionsBarContext,
  getScheduleJobSearch,
} from './context';

export default lazyComponent(() => import('./HostsIndexPage'), 'HostsIndex');
