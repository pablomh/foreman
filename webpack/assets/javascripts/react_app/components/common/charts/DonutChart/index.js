import React from 'react';
import LazyComponent from '../../LazyComponent';

const loader = () => import('./DonutChartImpl');

const DonutChart = props => <LazyComponent loader={loader} {...props} />;

export default DonutChart;
