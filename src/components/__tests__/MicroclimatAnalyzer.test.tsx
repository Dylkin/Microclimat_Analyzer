import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MicroclimatAnalyzer from '../MicroclimatAnalyzer';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return { ...actual, default: actual };
});

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      fullName: 'Test User'
    }
  })
}));

jest.mock('../../utils/contractorService', () => ({
  contractorService: {
    getContractors: jest.fn(() => Promise.resolve([]))
  }
}));

jest.mock('../../utils/qualificationObjectService', () => ({
  qualificationObjectService: {
    getQualificationObjectsByContractor: jest.fn(() => Promise.resolve([]))
  }
}));

jest.mock('../../utils/database', () => ({
  databaseService: {
    getProjects: jest.fn(() => Promise.resolve([]))
  }
}));

jest.mock('../../utils/uploadedFileService', () => ({
  uploadedFileService: {
    getUploadedFiles: jest.fn(() => Promise.resolve([])),
    saveUploadedFiles: jest.fn(() => Promise.resolve())
  }
}));

jest.mock('../../utils/vi2Parser', () => ({
  VI2ParsingService: {
    parseFile: jest.fn(() => Promise.resolve({
      fileName: 'test.xls',
      deviceMetadata: {},
      measurements: [],
      startDate: new Date(),
      endDate: new Date(),
      recordCount: 0,
      parsingStatus: 'completed'
    }))
  }
}));

jest.mock('../TimeSeriesChart', () => ({
  TimeSeriesChart: () => <div data-testid="time-series-chart" />
}));

describe('MicroclimatAnalyzer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders microclimat analyzer component', () => {
    render(<MicroclimatAnalyzer />);
    
    expect(screen.getByText('Анализ микроклимата')).toBeInTheDocument();
    expect(screen.getByLabelText('Загрузить файлы VI2')).toBeInTheDocument();
  });

  test('handles file upload', async () => {
    const user = userEvent.setup();
    render(<MicroclimatAnalyzer />);
    
    const fileInput = screen.getByLabelText('Загрузить файлы VI2');
    const file = new File(['test content'], 'test.xls', { type: 'application/vnd.ms-excel' });

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText('test.xls')).toBeInTheDocument();
    });
  });
});
