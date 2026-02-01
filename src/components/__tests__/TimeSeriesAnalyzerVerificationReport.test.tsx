import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TimeSeriesAnalyzer } from '../TimeSeriesAnalyzer';
import { qualificationWorkScheduleService } from '../../utils/qualificationWorkScheduleService';
import { equipmentService } from '../../utils/equipmentService';
import { reportService } from '../../utils/reportService';
import { loggerDataService } from '../../utils/loggerDataService';

// Mock сервисов
jest.mock('../../utils/qualificationWorkScheduleService', () => ({
  qualificationWorkScheduleService: {
    isAvailable: jest.fn(),
    getWorkSchedule: jest.fn()
  }
}));

jest.mock('../../utils/equipmentService', () => ({
  equipmentService: {
    isAvailable: jest.fn(),
    getAllEquipment: jest.fn()
  }
}));

jest.mock('../../utils/reportService', () => ({
  reportService: {
    isAvailable: jest.fn(),
    findExistingReport: jest.fn(),
    saveReport: jest.fn(),
    getReportsByProjectAndObject: jest.fn()
  }
}));

jest.mock('../../utils/loggerDataService', () => ({
  loggerDataService: {
    isAvailable: jest.fn(),
    getLoggerDataSummary: jest.fn()
  }
}));
jest.mock('../TimeSeriesChart', () => ({
  TimeSeriesChart: () => <div data-testid="time-series-chart">Chart</div>
}));

// Mock для useAuth
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', fullName: 'Test User', email: 'test@test.com', role: 'admin' }
  })
}));

// Mock для useTimeSeriesData
jest.mock('../../hooks/useTimeSeriesData', () => ({
  useTimeSeriesData: () => ({
    data: { points: [] },
    loading: false,
    error: null
  })
}));

// Mock для html2canvas
jest.mock('html2canvas', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({
    toDataURL: () => 'data:image/png;base64,test'
  }))
}));

// Mock для JSZip
jest.mock('jszip', () => {
  return jest.fn().mockImplementation(() => ({
    folder: jest.fn(() => ({
      file: jest.fn(),
      folder: jest.fn(() => ({
        file: jest.fn()
      }))
    })),
    generateAsync: jest.fn(() => Promise.resolve(new Blob(['test'], { type: 'application/zip' })))
  }));
});

const mockQualificationWorkScheduleService = qualificationWorkScheduleService as jest.Mocked<typeof qualificationWorkScheduleService>;
const mockEquipmentService = equipmentService as jest.Mocked<typeof equipmentService>;
const mockReportService = reportService as jest.Mocked<typeof reportService>;
const mockLoggerDataService = loggerDataService as jest.Mocked<typeof loggerDataService>;

describe('TimeSeriesAnalyzer - Формирование приложения свидетельства о поверке', () => {
  const mockWorkSchedule = [
    {
      id: 'stage-1',
      qualificationObjectId: 'object-1',
      projectId: 'project-1',
      stageName: 'Расстановка логгеров',
      stageDescription: 'Установка логгеров',
      startDate: '2025-11-08',
      endDate: '2025-11-10',
      isCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const mockEquipment = [
    {
      id: 'equipment-1',
      type: 'Testo 174T' as const,
      name: 'DL-001',
      serialNumber: 'DL-001',
      createdAt: new Date(),
      updatedAt: new Date(),
      verifications: [
        {
          id: 'verification-1',
          equipmentId: 'equipment-1',
          verificationStartDate: new Date('2025-01-01'),
          verificationEndDate: new Date('2025-12-31'),
          verificationFileUrl: 'http://example.com/verification1.png',
          verificationFileName: 'verification1.png',
          createdAt: new Date()
        }
      ]
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();

    // Mock fetch для загрузки изображений
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob(['test'], { type: 'image/png' }))
      } as Response)
    );

    // Mock canvas
    HTMLCanvasElement.prototype.toBlob = jest.fn((callback) => {
      callback?.(new Blob(['test'], { type: 'image/png' }));
    });

    mockQualificationWorkScheduleService.isAvailable = jest.fn().mockReturnValue(true);
    mockQualificationWorkScheduleService.getWorkSchedule = jest.fn().mockResolvedValue(mockWorkSchedule);

    mockEquipmentService.isAvailable = jest.fn().mockReturnValue(true);
    mockEquipmentService.getAllEquipment = jest.fn().mockResolvedValue({
      equipment: mockEquipment,
      total: 1,
      totalPages: 1
    });

    mockReportService.isAvailable = jest.fn().mockReturnValue(true);
    mockReportService.findExistingReport = jest.fn().mockResolvedValue(null);
    mockReportService.saveReport = jest.fn().mockResolvedValue({
      id: 'report-1',
      projectId: 'project-1',
      qualificationObjectId: 'object-1',
      reportName: 'Приложение свидетельства о поверке',
      reportType: 'template',
      reportUrl: 'blob:mock-url',
      reportFilename: 'test.docx',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    mockLoggerDataService.isAvailable = jest.fn().mockReturnValue(true);
    mockLoggerDataService.getLoggerDataSummary = jest.fn().mockResolvedValue([]);
  });

  test('отображает кнопку "Сформировать приложение свидетельства о поверке"', async () => {
    render(
      <TimeSeriesAnalyzer
        files={[]}
        qualificationObjectId="object-1"
        projectId="project-1"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Сформировать приложение свидетельства о поверке')).toBeInTheDocument();
    });
  });

  test('кнопка отключена когда нет projectId или qualificationObjectId', () => {
    render(
      <TimeSeriesAnalyzer
        files={[]}
        qualificationObjectId={undefined}
        projectId={undefined}
      />
    );

    const button = screen.getByText('Сформировать приложение свидетельства о поверке').closest('button');
    expect(button).toBeDisabled();
  });

  test('отображает блок "Приложения к отчету" вместо "Сохраненные отчеты"', async () => {
    mockReportService.getReportsByProjectAndObject = jest.fn().mockResolvedValue([]);

    render(
      <TimeSeriesAnalyzer
        files={[]}
        qualificationObjectId="object-1"
        projectId="project-1"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Приложения к отчету')).toBeInTheDocument();
      expect(screen.queryByText('Сохраненные отчеты')).not.toBeInTheDocument();
    });
  });

  test('отображает кнопку "Сформировать приложение о испытаниях" вместо "Сформировать отчет"', async () => {
    render(
      <TimeSeriesAnalyzer
        files={[]}
        qualificationObjectId="object-1"
        projectId="project-1"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Сформировать приложение о испытаниях')).toBeInTheDocument();
      expect(screen.queryByText('Сформировать отчет')).not.toBeInTheDocument();
    });
  });
});

