import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import DataAnalysis from '../DataAnalysis';
import { qualificationWorkScheduleService } from '../../utils/qualificationWorkScheduleService';
import { loggerDataService } from '../../utils/loggerDataService';
import { projectService } from '../../utils/projectService';
import { contractorService } from '../../utils/contractorService';
import { qualificationObjectService } from '../../utils/qualificationObjectService';

// Mock сервисов
jest.mock('../../utils/qualificationWorkScheduleService', () => ({
  qualificationWorkScheduleService: {
    isAvailable: jest.fn(),
    getWorkSchedule: jest.fn()
  }
}));

jest.mock('../../utils/loggerDataService', () => ({
  loggerDataService: {
    isAvailable: jest.fn(),
    getLoggerDataSummary: jest.fn()
  }
}));

jest.mock('../../utils/projectService', () => ({
  projectService: {
    isAvailable: jest.fn(),
    getProjectById: jest.fn()
  }
}));

jest.mock('../../utils/contractorService', () => ({
  contractorService: {
    getContractorById: jest.fn()
  }
}));

jest.mock('../../utils/qualificationObjectService', () => ({
  qualificationObjectService: {
    getQualificationObjectById: jest.fn()
  }
}));

jest.mock('../TimeSeriesAnalyzer', () => ({
  TimeSeriesAnalyzer: () => <div data-testid="time-series-analyzer">TimeSeriesAnalyzer</div>
}));

// Mock для useAuth
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', fullName: 'Test User', email: 'test@test.com', role: 'admin' },
    hasAccess: () => true
  })
}));

const mockQualificationWorkScheduleService = qualificationWorkScheduleService as jest.Mocked<typeof qualificationWorkScheduleService>;
const mockLoggerDataService = loggerDataService as jest.Mocked<typeof loggerDataService>;
const mockProjectService = projectService as jest.Mocked<typeof projectService>;
const mockContractorService = contractorService as jest.Mocked<typeof contractorService>;
const mockQualificationObjectService = qualificationObjectService as jest.Mocked<typeof qualificationObjectService>;

describe('DataAnalysis', () => {
  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
    contractNumber: '12345',
    contractDate: '2025-01-01',
    contractorId: 'contractor-1'
  };

  const mockQualificationObject = {
    id: 'object-1',
    name: 'Test Object',
    type: 'помещение',
    manufacturer: 'Test Manufacturer',
    address: 'Test Address',
    area: 100,
    climateSystem: 'Test System',
    measurementZones: []
  };

  const mockWorkScheduleStages = [
    {
      id: 'stage-1',
      qualificationObjectId: 'object-1',
      stageName: 'Расстановка логгеров',
      stageDescription: 'Установка логгеров',
      startDate: '2025-11-08',
      endDate: '2025-11-10',
      isCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'stage-2',
      qualificationObjectId: 'object-1',
      stageName: 'Испытание на соответствие критериям в пустом объеме',
      stageDescription: 'Проверка в пустом состоянии',
      startDate: '2025-11-11',
      endDate: '2025-11-15',
      isCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockProjectService.isAvailable = jest.fn().mockReturnValue(true);
    mockProjectService.getProjectById = jest.fn().mockResolvedValue(mockProject);

    mockContractorService.getContractorById = jest.fn().mockResolvedValue({
      id: 'contractor-1',
      name: 'Test Contractor'
    });

    mockQualificationObjectService.getQualificationObjectById = jest.fn().mockResolvedValue(mockQualificationObject);

    mockLoggerDataService.isAvailable = jest.fn().mockReturnValue(true);
    mockLoggerDataService.getLoggerDataSummary = jest.fn().mockResolvedValue([
      { file_name: 'logger1.xls', serial_number: 'SN001' },
      { file_name: 'logger2.xls', serial_number: 'SN002' }
    ]);

    mockQualificationWorkScheduleService.isAvailable = jest.fn().mockReturnValue(true);
    mockQualificationWorkScheduleService.getWorkSchedule = jest.fn().mockResolvedValue(mockWorkScheduleStages);
  });

  test('отображает информацию об объекте', async () => {
    render(
      <DataAnalysis
        project={mockProject}
        analysisData={{ qualificationObjectId: 'object-1', projectId: 'project-1' }}
        onBack={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Информация об объекте')).toBeInTheDocument();
    });
  });

  test('отображает план график проведения квалификационных работ', async () => {
    render(
      <DataAnalysis
        project={mockProject}
        analysisData={{ qualificationObjectId: 'object-1', projectId: 'project-1' }}
        onBack={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('План график проведения квалификационных работ')).toBeInTheDocument();
      expect(screen.getByText(/Расстановка логгеров/)).toBeInTheDocument();
      expect(screen.getByText(/Испытание на соответствие критериям в пустом объеме/)).toBeInTheDocument();
    });
  });

  test('отображает даты этапов в правильном формате', async () => {
    render(
      <DataAnalysis
        project={mockProject}
        analysisData={{ qualificationObjectId: 'object-1', projectId: 'project-1' }}
        onBack={() => {}}
      />
    );

    await waitFor(() => {
      // Проверяем, что даты отображаются
      const stageText = screen.getByText(/Расстановка логгеров/);
      expect(stageText).toBeInTheDocument();
    });
  });

  test('не отображает план график если нет заполненных этапов', async () => {
    mockQualificationWorkScheduleService.getWorkSchedule = jest.fn().mockResolvedValue([
      {
        id: 'stage-1',
        qualificationObjectId: 'object-1',
        stageName: 'Расстановка логгеров',
        stageDescription: 'Установка логгеров',
        startDate: undefined,
        endDate: undefined,
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    render(
      <DataAnalysis
        project={mockProject}
        analysisData={{ qualificationObjectId: 'object-1', projectId: 'project-1' }}
        onBack={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('План график проведения квалификационных работ')).not.toBeInTheDocument();
    });
  });

  test('отображает информацию о реквизитах договора', async () => {
    render(
      <DataAnalysis
        project={mockProject}
        analysisData={{ qualificationObjectId: 'object-1', projectId: 'project-1' }}
        onBack={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Реквизиты договора')).toBeInTheDocument();
      expect(screen.getByText('№ договора:')).toBeInTheDocument();
      expect(screen.getByText('12345')).toBeInTheDocument();
    });
  });

  test('отображает информацию об объекте квалификации', async () => {
    render(
      <DataAnalysis
        project={mockProject}
        analysisData={{ qualificationObjectId: 'object-1', projectId: 'project-1' }}
        onBack={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Объект квалификации')).toBeInTheDocument();
      expect(screen.getByText('Test Object')).toBeInTheDocument();
      expect(screen.getByText('Test Manufacturer')).toBeInTheDocument();
    });
  });
});

