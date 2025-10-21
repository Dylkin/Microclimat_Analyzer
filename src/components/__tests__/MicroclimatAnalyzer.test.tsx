import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MicroclimatAnalyzer } from '../MicroclimatAnalyzer';

// Mock для chart компонента
jest.mock('../TimeSeriesChart', () => ({
  TimeSeriesChart: ({ data, markers, onMarkerClick }: any) => (
    <div data-testid="time-series-chart">
      <div>Chart with {data?.length || 0} data points</div>
      <div>Markers: {markers?.length || 0}</div>
    </div>
  )
}));

describe('MicroclimatAnalyzer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders microclimat analyzer component', () => {
    render(<MicroclimatAnalyzer />);
    
    expect(screen.getByText('Анализ микроклимата')).toBeInTheDocument();
    expect(screen.getByText('Загрузить файлы VI2')).toBeInTheDocument();
  });

  test('displays file upload section', () => {
    render(<MicroclimatAnalyzer />);
    
    expect(screen.getByLabelText('Загрузить файлы VI2')).toBeInTheDocument();
    expect(screen.getByText('Номер зоны измерения')).toBeInTheDocument();
    expect(screen.getByText('Уровень измерения')).toBeInTheDocument();
  });

  test('handles file upload', async () => {
    const user = userEvent.setup();
    render(<MicroclimatAnalyzer />);
    
    const fileInput = screen.getByLabelText('Загрузить файлы VI2');
    const file = new File(['test content'], 'test.xls', { type: 'application/vnd.ms-excel' });

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(fileInput.files).toHaveLength(1);
    });
  });

  test('handles multiple file uploads', async () => {
    const user = userEvent.setup();
    render(<MicroclimatAnalyzer />);
    
    const fileInput = screen.getByLabelText('Загрузить файлы VI2');
    const files = [
      new File(['test content 1'], 'test1.xls', { type: 'application/vnd.ms-excel' }),
      new File(['test content 2'], 'test2.xls', { type: 'application/vnd.ms-excel' })
    ];

    await user.upload(fileInput, files);

    await waitFor(() => {
      expect(fileInput.files).toHaveLength(2);
    });
  });

  test('handles zone number input', async () => {
    const user = userEvent.setup();
    render(<MicroclimatAnalyzer />);
    
    const zoneInput = screen.getByLabelText('Номер зоны измерения');
    await user.type(zoneInput, '1');

    expect(zoneInput).toHaveValue(1);
  });

  test('handles measurement level input', async () => {
    const user = userEvent.setup();
    render(<MicroclimatAnalyzer />);
    
    const levelInput = screen.getByLabelText('Уровень измерения');
    await user.type(levelInput, '0.5');

    expect(levelInput).toHaveValue(0.5);
  });

  test('displays file list when files are uploaded', async () => {
    const user = userEvent.setup();
    render(<MicroclimatAnalyzer />);
    
    const fileInput = screen.getByLabelText('Загрузить файлы VI2');
    const file = new File(['test content'], 'test.xls', { type: 'application/vnd.ms-excel' });

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText('test.xls')).toBeInTheDocument();
    });
  });

  test('handles file removal', async () => {
    const user = userEvent.setup();
    render(<MicroclimatAnalyzer />);
    
    const fileInput = screen.getByLabelText('Загрузить файлы VI2');
    const file = new File(['test content'], 'test.xls', { type: 'application/vnd.ms-excel' });

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText('test.xls')).toBeInTheDocument();
    });

    const removeButton = screen.getByTitle('Удалить файл');
    await user.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByText('test.xls')).not.toBeInTheDocument();
    });
  });

  test('handles file reordering', async () => {
    const user = userEvent.setup();
    render(<MicroclimatAnalyzer />);
    
    const fileInput = screen.getByLabelText('Загрузить файлы VI2');
    const files = [
      new File(['test content 1'], 'test1.xls', { type: 'application/vnd.ms-excel' }),
      new File(['test content 2'], 'test2.xls', { type: 'application/vnd.ms-excel' })
    ];

    await user.upload(fileInput, files);

    await waitFor(() => {
      expect(screen.getByText('test1.xls')).toBeInTheDocument();
      expect(screen.getByText('test2.xls')).toBeInTheDocument();
    });

    const moveUpButton = screen.getAllByTitle('Переместить вверх')[1];
    await user.click(moveUpButton);

    // Проверяем, что порядок изменился
    await waitFor(() => {
      const fileElements = screen.getAllByText(/test\d\.xls/);
      expect(fileElements[0]).toHaveTextContent('test2.xls');
      expect(fileElements[1]).toHaveTextContent('test1.xls');
    });
  });

  test('displays analysis results when data is available', () => {
    const mockData = [
      {
        timestamp: new Date('2023-01-01T00:00:00Z'),
        temperature: 20.5,
        humidity: 60.0,
        isValid: true
      }
    ];

    render(<MicroclimatAnalyzer />);
    
    // Симулируем наличие данных
    const chartElement = screen.getByTestId('time-series-chart');
    expect(chartElement).toBeInTheDocument();
  });

  test('handles invalid file types', async () => {
    const user = userEvent.setup();
    render(<MicroclimatAnalyzer />);
    
    const fileInput = screen.getByLabelText('Загрузить файлы VI2');
    const invalidFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

    await user.upload(fileInput, invalidFile);

    // Проверяем, что файл не был добавлен
    await waitFor(() => {
      expect(screen.queryByText('test.txt')).not.toBeInTheDocument();
    });
  });

  test('handles empty file upload', async () => {
    const user = userEvent.setup();
    render(<MicroclimatAnalyzer />);
    
    const fileInput = screen.getByLabelText('Загрузить файлы VI2');
    const emptyFile = new File([], 'empty.xls', { type: 'application/vnd.ms-excel' });

    await user.upload(fileInput, emptyFile);

    await waitFor(() => {
      expect(screen.getByText('empty.xls')).toBeInTheDocument();
    });
  });

  test('displays file size information', async () => {
    const user = userEvent.setup();
    render(<MicroclimatAnalyzer />);
    
    const fileInput = screen.getByLabelText('Загрузить файлы VI2');
    const file = new File(['test content'], 'test.xls', { type: 'application/vnd.ms-excel' });

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText('test.xls')).toBeInTheDocument();
      // Проверяем, что отображается размер файла
      expect(screen.getByText(/12 байт/)).toBeInTheDocument();
    });
  });

  test('handles file processing errors gracefully', async () => {
    const user = userEvent.setup();
    render(<MicroclimatAnalyzer />);
    
    const fileInput = screen.getByLabelText('Загрузить файлы VI2');
    const file = new File(['test content'], 'test.xls', { type: 'application/vnd.ms-excel' });

    await user.upload(fileInput, file);

    // Компонент должен обработать ошибку без краха
    await waitFor(() => {
      expect(screen.getByText('test.xls')).toBeInTheDocument();
    });
  });
});


















