import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConfigReports from './ConfigReports';

const mockData = {
  metricsChartData: [['runtime', 5]],
  statusChartData: [['applied', 2]],
  metricsData: {
    tableData: [['config_retrieval', 10]],
    total: 10,
  },
};

describe('ConfigReports', () => {
  it('should render chart titles', async () => {
    render(<ConfigReports data={mockData} />);

    expect(await screen.findByText('Report Metrics')).toBeInTheDocument();
    expect(screen.getByText('Report Status')).toBeInTheDocument();
  });

  it('should render metrics table with data and total', async () => {
    render(<ConfigReports data={mockData} />);

    expect(await screen.findByText('config_retrieval')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('should render multiple metrics rows', async () => {
    const multiMetricData = {
      ...mockData,
      metricsData: {
        tableData: [
          ['config_retrieval', 10],
          ['exec_report', 5],
        ],
        total: 15,
      },
    };
    render(<ConfigReports data={multiMetricData} />);

    expect(await screen.findByText('config_retrieval')).toBeInTheDocument();
    expect(screen.getByText('exec_report')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });
});
