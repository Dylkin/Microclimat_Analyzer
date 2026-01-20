import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as ContractNegotiationModule from '../../ContractNegotiation';
import { Project } from '../../../types/Project';
import { useAuth } from '../../../contexts/AuthContext';

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn()
}));

jest.mock('../../../utils/contractorService', () => ({
  contractorService: {
    getContractorById: jest.fn(() => Promise.resolve({ id: 'test-contractor-id', name: 'Test Contractor' }))
  }
}));

jest.mock('../../../utils/enhancedProjectDocumentService', () => ({
  enhancedProjectDocumentService: {
    getProjectDocuments: jest.fn(() => Promise.resolve({ regularDocuments: [], qualificationProtocols: [] }))
  }
}));

jest.mock('../../../utils/projectService', () => ({
  projectService: {
    getProjectById: jest.fn(() => Promise.resolve({
      id: 'test-project-id',
      name: 'Test Project',
      status: 'contract_negotiation',
      contractorId: 'test-contractor-id',
      contractorName: 'Test Contractor',
      qualificationObjects: []
    }))
  }
}));

jest.mock('../../../utils/qualificationObjectService', () => ({
  qualificationObjectService: {
    getQualificationObjectsByContractor: jest.fn(() => Promise.resolve([
      {
        id: 'obj-1',
        contractorId: 'test-contractor-id',
        type: 'помещение',
        name: 'Test Room',
        area: 100,
        address: 'Test Address',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ])),
    getQualificationObjectById: jest.fn()
  }
}));

jest.mock('../../../utils/documentApprovalService', () => ({
  documentApprovalService: {
    getApprovalStatus: jest.fn(() => Promise.resolve({
      documentId: 'doc-1',
      status: 'pending',
      lastApproval: undefined,
      comments: [],
      approvalHistory: []
    }))
  }
}));

const mockProject: Project = {
  id: 'test-project-id',
  name: 'Test Project',
  description: 'Test project description',
  status: 'contract_negotiation',
  contractorId: 'test-contractor-id',
  contractorName: 'Test Contractor',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  qualificationObjects: [
    {
      qualificationObjectId: 'obj-1',
      qualificationObjectType: 'помещение',
      qualificationObjectName: 'Test Room',
      area: 100,
      address: 'Test Address'
    }
  ]
};

describe('Contract Negotiation Integration Tests', () => {
  const ContractNegotiation =
    (ContractNegotiationModule as any).default || (ContractNegotiationModule as any).ContractNegotiation;

  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin'
      }
    });
  });

  test('renders contract negotiation page', () => {
    render(<ContractNegotiation project={mockProject} onBack={mockOnBack} />);

    expect(screen.getByText('Согласование договора')).toBeInTheDocument();
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  test('qualification object selection controls are visible', async () => {
    render(<ContractNegotiation project={mockProject} onBack={mockOnBack} />);

    const selectButtons = await screen.findAllByTitle('Выбрать объект');
    expect(selectButtons.length).toBeGreaterThan(0);
  });

  test('document upload section', () => {
    render(<ContractNegotiation project={mockProject} onBack={mockOnBack} />);

    const uploadButtons = screen.getAllByText(/выбрать файл/i);
    expect(uploadButtons.length).toBeGreaterThan(0);
  });

  test('approval actions are visible', () => {
    render(<ContractNegotiation project={mockProject} onBack={mockOnBack} />);

    const approveButtons = screen.getAllByText(/согласовано/i);
    expect(approveButtons.length).toBeGreaterThan(0);
  });
});
