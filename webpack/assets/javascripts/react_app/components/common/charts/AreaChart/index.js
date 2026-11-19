import React from 'react';
import LazyComponent from '../../LazyComponent';

const loader = () => import('./AreaChartImpl');

const AreaChart = props => <LazyComponent loader={loader} {...props} />;

export default AreaChart;
