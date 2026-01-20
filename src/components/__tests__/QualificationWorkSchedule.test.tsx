import React from 'react';
import { render, screen } from '@testing-library/react';
import { QualificationWorkSchedule } from '../QualificationWorkSchedule';
import { qualificationWorkScheduleService } from '../../utils/qualificationWorkScheduleService';
import { loggerDataService } from '../../utils/loggerDataService';

jest.mock('../../utils/qualificationWorkScheduleService');
jest.mock('../../utils/loggerDataService');
jest.mock('../../utils/qualificationObjectService');
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      fullName: 'Test User'
    }
  })
}));

const mockQualificationWorkScheduleService = qualificationWorkScheduleService as jest.Mocked<typeof qualificationWorkScheduleService>;
const mockLoggerDataService = loggerDataService as jest.Mocked<typeof loggerDataService>;

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
    mockQualificationWorkScheduleService.isAvailable.mockReturnValue(true);
    mockQualificationWorkScheduleService.getWorkSchedule.mockResolvedValue([]);
    mockQualificationWorkScheduleService.createAllStages.mockResolvedValue([]);
    mockLoggerDataService.isAvailable.mockReturnValue(true);
    mockLoggerDataService.getLoggerDataSummary.mockResolvedValue([]);
  });

  test('renders qualification work schedule component', () => {
    render(<QualificationWorkSchedule {...defaultProps} />);
    
    expect(screen.getByText('План график проведения квалификационных работ')).toBeInTheDocument();
    expect(screen.getByText('Test Object')).toBeInTheDocument();
  });
});
