import React from 'react';
import LazyComponent from '../../LazyComponent';

const loader = () => import('./BarChartImpl');

const BarChart = props => <LazyComponent loader={loader} {...props} />;

export default BarChart;
