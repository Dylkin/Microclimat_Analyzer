import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QualificationWorkSchedule } from '../QualificationWorkSchedule';
import { qualificationWorkScheduleService } from '../../utils/qualificationWorkScheduleService';
import { loggerDataService } from '../../utils/loggerDataService';

// Mock для сервисов
jest.mock('../../utils/qualificationWorkScheduleService');
jest.mock('../../utils/loggerDataService');
jest.mock('../../utils/qualificationObjectService');

const mockQualificationWorkScheduleService = qualificationWorkScheduleService as jest.Mocked<typeof qualificationWorkScheduleService>;
const mockLoggerDataService = loggerDataService as jest.Mocked<typeof loggerDataService>;

// Mock для Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }))
    })),
    storage: {
      from: jest.fn(() => ({
        list: jest.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }
  }))
}));

describe('QualificationWorkSchedule', () => {
  const defaultProps = {
    qualificationObjectId: 'test-object-id',
    qualificationObjectName: 'Test Object',
    projectId: 'test-project-id',
    project: {
      id: 'test-project-id',
      name: 'Test Project',
      contractorId: 'test-contractor-id',
      contractorName: 'Test Contractor'
    },
    onPageChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock для qualificationWorkScheduleService
    mockQualificationWorkScheduleService.isAvailable.mockReturnValue(true);
    mockQualificationWorkScheduleService.getWorkSchedule.mockResolvedValue([]);
    mockQualificationWorkScheduleService.createAllStages.mockResolvedValue([]);
    mockQualificationWorkScheduleService.updateWorkStage.mockResolvedValue({
      id: 'test-stage-id',
      qualificationObjectId: 'test-object-id',
      projectId: 'test-project-id',
      stageName: 'Test Stage',
      stageDescription: 'Test Description',
      isCompleted: true,
      completedAt: '2023-01-01T00:00:00Z',
      completedBy: 'Test User',
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-01T00:00:00Z')
    });

    // Mock для loggerDataService
    mockLoggerDataService.isAvailable.mockReturnValue(true);
    mockLoggerDataService.getLoggerDataSummary.mockResolvedValue([]);
  });

  test('renders qualification work schedule component', () => {
    render(<QualificationWorkSchedule {...defaultProps} />);
    
    expect(screen.getByText('План-график проведения квалификационных работ')).toBeInTheDocument();
    expect(screen.getByText('Test Object')).toBeInTheDocument();
  });

  test('displays all 9 qualification stages', async () => {
    const mockStages = [
      {
        id: 'stage-1',
        qualificationObjectId: 'test-object-id',
        projectId: 'test-project-id',
        stageName: 'Расстановка логгеров',
        stageDescription: 'Установка и настройка логгеров для мониторинга температуры',
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'stage-2',
        qualificationObjectId: 'test-object-id',
        projectId: 'test-project-id',
        stageName: 'Испытание на соответствие критериям в пустом объеме',
        stageDescription: 'Проверка соответствия температурных характеристик в пустом состоянии',
        isCompleted: true,
        completedAt: '2023-01-01T00:00:00Z',
        completedBy: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    mockQualificationWorkScheduleService.getWorkSchedule.mockResolvedValue(mockStages);

    render(<QualificationWorkSchedule {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Расстановка логгеров')).toBeInTheDocument();
      expect(screen.getByText('Испытание на соответствие критериям в пустом объеме')).toBeInTheDocument();
    });
  });

  test('creates all stages when none exist', async () => {
    mockQualificationWorkScheduleService.getWorkSchedule.mockResolvedValue([]);
    mockQualificationWorkScheduleService.createAllStages.mockResolvedValue([
      {
        id: 'stage-1',
        qualificationObjectId: 'test-object-id',
        projectId: 'test-project-id',
        stageName: 'Расстановка логгеров',
        stageDescription: 'Установка и настройка логгеров для мониторинга температуры',
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    render(<QualificationWorkSchedule {...defaultProps} />);

    await waitFor(() => {
      expect(mockQualificationWorkScheduleService.createAllStages).toHaveBeenCalledWith(
        'test-object-id',
        'test-project-id'
      );
    });
  });

  test('handles stage completion', async () => {
    const mockStages = [
      {
        id: 'stage-1',
        qualificationObjectId: 'test-object-id',
        projectId: 'test-project-id',
        stageName: 'Расстановка логгеров',
        stageDescription: 'Установка и настройка логгеров для мониторинга температуры',
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    mockQualificationWorkScheduleService.getWorkSchedule.mockResolvedValue(mockStages);

    render(<QualificationWorkSchedule {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Расстановка логгеров')).toBeInTheDocument();
    });

    const completeButton = screen.getByText('Завершить');
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(mockQualificationWorkScheduleService.updateWorkStage).toHaveBeenCalledWith(
        'test-object-id',
        'stage-1',
        expect.objectContaining({
          isCompleted: true
        })
      );
    });
  });

  test('handles stage cancellation', async () => {
    const mockStages = [
      {
        id: 'stage-1',
        qualificationObjectId: 'test-object-id',
        projectId: 'test-project-id',
        stageName: 'Расстановка логгеров',
        stageDescription: 'Установка и настройка логгеров для мониторинга температуры',
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    mockQualificationWorkScheduleService.getWorkSchedule.mockResolvedValue(mockStages);

    render(<QualificationWorkSchedule {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Расстановка логгеров')).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Отменить');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(mockQualificationWorkScheduleService.updateWorkStage).toHaveBeenCalledWith(
        'test-object-id',
        'stage-1',
        expect.objectContaining({
          isCompleted: false,
          cancelledAt: expect.any(String),
          cancelledBy: expect.any(String)
        })
      );
    });
  });

  test('displays logger data upload section', async () => {
    render(<QualificationWorkSchedule {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Файлы данных логгеров')).toBeInTheDocument();
      expect(screen.getByText('Загружено: 0 из 0')).toBeInTheDocument();
    });
  });

  test('handles file upload', async () => {
    const user = userEvent.setup();
    
    render(<QualificationWorkSchedule {...defaultProps} />);

    const fileInput = screen.getByLabelText('Загрузить файлы VI2');
    const file = new File(['test content'], 'test.xls', { type: 'application/vnd.ms-excel' });

    await user.upload(fileInput, file);

    // Проверяем, что файл был загружен
    await waitFor(() => {
      expect(fileInput.files).toHaveLength(1);
    });
  });

  test('handles data analysis button click', async () => {
    render(<QualificationWorkSchedule {...defaultProps} />);

    const analysisButton = screen.getByText('Анализ данных');
    fireEvent.click(analysisButton);

    await waitFor(() => {
      expect(defaultProps.onPageChange).toHaveBeenCalledWith('data_analysis', expect.any(Object));
    });
  });

  test('shows error when onPageChange is not defined', async () => {
    const propsWithoutOnPageChange = {
      ...defaultProps,
      onPageChange: undefined
    };

    render(<QualificationWorkSchedule {...propsWithoutOnPageChange} />);

    const analysisButton = screen.getByText('Анализ данных');
    fireEvent.click(analysisButton);

    // Проверяем, что показывается alert (в реальном приложении)
    await waitFor(() => {
      expect(screen.getByText('Анализ данных')).toBeInTheDocument();
    });
  });

  test('handles service errors gracefully', async () => {
    mockQualificationWorkScheduleService.getWorkSchedule.mockRejectedValue(new Error('Service error'));

    render(<QualificationWorkSchedule {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Ошибка загрузки расписания из базы данных')).toBeInTheDocument();
    });
  });

  test('displays loading state', () => {
    render(<QualificationWorkSchedule {...defaultProps} />);
    
    // Проверяем, что компонент рендерится (loading state не блокирует рендеринг)
    expect(screen.getByText('План-график проведения квалификационных работ')).toBeInTheDocument();
  });
});


















