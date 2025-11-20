import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimeSeriesAnalyzer } from '../TimeSeriesAnalyzer';

// Mock для chart компонента
jest.mock('../TimeSeriesChart', () => ({
  TimeSeriesChart: ({ data, markers, onMarkerClick }: any) => (
    <div data-testid="time-series-chart">
      <div>Chart with {data?.length || 0} data points</div>
      <div>Markers: {markers?.length || 0}</div>
      {markers?.map((marker: any, index: number) => (
        <button
          key={index}
          onClick={() => onMarkerClick?.(marker)}
          data-testid={`marker-${index}`}
        >
          {marker.name}
        </button>
      ))}
    </div>
  )
}));

describe('TimeSeriesAnalyzer', () => {
  const defaultProps = {
    data: [
      {
        timestamp: new Date('2023-01-01T00:00:00Z'),
        temperature: 20.5,
        humidity: 60.0,
        isValid: true
      },
      {
        timestamp: new Date('2023-01-01T01:00:00Z'),
        temperature: 21.0,
        humidity: 58.0,
        isValid: true
      }
    ],
    onMarkerClick: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders time series analyzer component', () => {
    render(<TimeSeriesAnalyzer {...defaultProps} />);
    
    expect(screen.getByText('Анализ временных рядов')).toBeInTheDocument();
    expect(screen.getByTestId('time-series-chart')).toBeInTheDocument();
  });

  test('displays chart with data', () => {
    render(<TimeSeriesAnalyzer {...defaultProps} />);
    
    expect(screen.getByText('Chart with 2 data points')).toBeInTheDocument();
  });

  test('displays empty chart when no data', () => {
    render(<TimeSeriesAnalyzer {...defaultProps} data={[]} />);
    
    expect(screen.getByText('Chart with 0 data points')).toBeInTheDocument();
  });

  test('handles marker click', () => {
    const markers = [
      {
        id: 'marker-1',
        name: 'Test Marker',
        timestamp: new Date('2023-01-01T00:30:00Z'),
        type: 'temperature',
        value: 20.8
      }
    ];

    render(<TimeSeriesAnalyzer {...defaultProps} markers={markers} />);
    
    const markerButton = screen.getByTestId('marker-0');
    fireEvent.click(markerButton);
    
    expect(defaultProps.onMarkerClick).toHaveBeenCalledWith(markers[0]);
  });

  test('displays markers count', () => {
    const markers = [
      { id: 'marker-1', name: 'Marker 1', timestamp: new Date(), type: 'temperature', value: 20 },
      { id: 'marker-2', name: 'Marker 2', timestamp: new Date(), type: 'humidity', value: 60 }
    ];

    render(<TimeSeriesAnalyzer {...defaultProps} markers={markers} />);
    
    expect(screen.getByText('Markers: 2')).toBeInTheDocument();
  });

  test('handles undefined markers', () => {
    render(<TimeSeriesAnalyzer {...defaultProps} markers={undefined} />);
    
    expect(screen.getByText('Markers: 0')).toBeInTheDocument();
  });

  test('handles undefined onMarkerClick', () => {
    const markers = [
      { id: 'marker-1', name: 'Test Marker', timestamp: new Date(), type: 'temperature', value: 20 }
    ];

    render(<TimeSeriesAnalyzer {...defaultProps} markers={markers} onMarkerClick={undefined} />);
    
    const markerButton = screen.getByTestId('marker-0');
    fireEvent.click(markerButton);
    
    // Не должно быть ошибки при клике без обработчика
    expect(screen.getByText('Markers: 1')).toBeInTheDocument();
  });

  test('renders with different data types', () => {
    const mixedData = [
      {
        timestamp: new Date('2023-01-01T00:00:00Z'),
        temperature: 20.5,
        humidity: 60.0,
        isValid: true
      },
      {
        timestamp: new Date('2023-01-01T01:00:00Z'),
        temperature: null,
        humidity: undefined,
        isValid: false
      }
    ];

    render(<TimeSeriesAnalyzer {...defaultProps} data={mixedData} />);
    
    expect(screen.getByText('Chart with 2 data points')).toBeInTheDocument();
  });

  test('handles large datasets', () => {
    const largeData = Array.from({ length: 1000 }, (_, i) => ({
      timestamp: new Date(`2023-01-01T${i.toString().padStart(2, '0')}:00:00Z`),
      temperature: 20 + Math.sin(i / 100) * 5,
      humidity: 60 + Math.cos(i / 100) * 10,
      isValid: true
    }));

    render(<TimeSeriesAnalyzer {...defaultProps} data={largeData} />);
    
    expect(screen.getByText('Chart with 1000 data points')).toBeInTheDocument();
  });

  test('handles empty markers array', () => {
    render(<TimeSeriesAnalyzer {...defaultProps} markers={[]} />);
    
    expect(screen.getByText('Markers: 0')).toBeInTheDocument();
  });

  test('renders without crashing with minimal props', () => {
    render(<TimeSeriesAnalyzer data={[]} />);
    
    expect(screen.getByText('Анализ временных рядов')).toBeInTheDocument();
    expect(screen.getByText('Chart with 0 data points')).toBeInTheDocument();
  });
});



















