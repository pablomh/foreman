import { lazyComponent } from '../../LazyComponent';

export default lazyComponent(() => import('./DonutChartImpl'), 'DonutChart');
