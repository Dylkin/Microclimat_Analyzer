import React from 'react';
import { render, screen } from '@testing-library/react';
import { TimeSeriesAnalyzer } from '../TimeSeriesAnalyzer';

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      fullName: 'Test User'
    }
  })
}));

jest.mock('../../hooks/useTimeSeriesData', () => ({
  useTimeSeriesData: () => ({
    data: { points: [] },
    loading: false,
    error: null
  })
}));

jest.mock('../TimeSeriesChart', () => ({
  TimeSeriesChart: ({ data }: any) => (
    <div data-testid="time-series-chart">Chart with {data?.length || 0} data points</div>
  )
}));

describe('TimeSeriesAnalyzer', () => {
  test('renders time series analyzer component', () => {
    render(<TimeSeriesAnalyzer files={[]} />);
    
    expect(screen.getByText('Анализ временных рядов')).toBeInTheDocument();
    expect(screen.getByTestId('time-series-chart')).toBeInTheDocument();
  });
});
