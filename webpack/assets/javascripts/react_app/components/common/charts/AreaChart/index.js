import { lazyComponent } from '../../LazyComponent';

export default lazyComponent(() => import('./AreaChartImpl'), 'AreaChart');
