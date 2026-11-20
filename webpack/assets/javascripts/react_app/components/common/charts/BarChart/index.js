import { lazyComponent } from '../../LazyComponent';

export default lazyComponent(() => import('./BarChartImpl'), 'BarChart');
