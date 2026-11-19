import { lazyComponent } from '../../common/LazyComponent';

export { ForemanActionsBarContext } from './context';
export default lazyComponent(() => import('./ActionsBar'), 'ActionsBar');
