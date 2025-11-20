import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContractNegotiation } from '../../ContractNegotiation';
import { Project } from '../../../types/Project';
import { AuthProvider } from '../../../contexts/AuthContext';

// Mock для AuthContext
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'admin'
};

const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    {children}
  </AuthProvider>
);

// Mock данные для проекта
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
    },
    {
      qualificationObjectId: 'obj-2',
      qualificationObjectType: 'автомобиль',
      qualificationObjectName: 'Test Car',
      vin: 'TEST123456789',
      model: 'Test Model'
    }
  ]
};

// Mock для onBack
const mockOnBack = jest.fn();

describe('ContractNegotiation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders contract negotiation page', () => {
    render(
      <MockAuthProvider>
        <ContractNegotiation project={mockProject} onBack={mockOnBack} />
      </MockAuthProvider>
    );

    expect(screen.getByText('Согласование договора')).toBeInTheDocument();
    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('Test Contractor')).toBeInTheDocument();
  });

  test('displays project information correctly', () => {
    render(
      <MockAuthProvider>
        <ContractNegotiation project={mockProject} onBack={mockOnBack} />
      </MockAuthProvider>
    );

    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('Test project description')).toBeInTheDocument();
    expect(screen.getByText('Test Contractor')).toBeInTheDocument();
  });

  test('displays qualification objects', () => {
    render(
      <MockAuthProvider>
        <ContractNegotiation project={mockProject} onBack={mockOnBack} />
      </MockAuthProvider>
    );

    expect(screen.getByText('Test Room')).toBeInTheDocument();
    expect(screen.getByText('Test Car')).toBeInTheDocument();
    expect(screen.getByText('Помещение')).toBeInTheDocument();
    expect(screen.getByText('Автомобиль')).toBeInTheDocument();
  });

  test('shows document upload sections', () => {
    render(
      <MockAuthProvider>
        <ContractNegotiation project={mockProject} onBack={mockOnBack} />
      </MockAuthProvider>
    );

    expect(screen.getByText('Коммерческое предложение')).toBeInTheDocument();
    expect(screen.getByText('Договор')).toBeInTheDocument();
    expect(screen.getByText('Протоколы квалификации')).toBeInTheDocument();
  });

  test('calls onBack when back button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <MockAuthProvider>
        <ContractNegotiation project={mockProject} onBack={mockOnBack} />
      </MockAuthProvider>
    );

    const backButton = screen.getByRole('button', { name: /назад/i });
    await user.click(backButton);

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  test('displays upload buttons for documents', () => {
    render(
      <MockAuthProvider>
        <ContractNegotiation project={mockProject} onBack={mockOnBack} />
      </MockAuthProvider>
    );

    const uploadButtons = screen.getAllByText(/загрузить/i);
    expect(uploadButtons.length).toBeGreaterThan(0);
  });

  test('shows qualification objects selection', () => {
    render(
      <MockAuthProvider>
        <ContractNegotiation project={mockProject} onBack={mockOnBack} />
      </MockAuthProvider>
    );

    // Проверяем наличие чекбоксов для выбора объектов
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  test('displays progress information', () => {
    render(
      <MockAuthProvider>
        <ContractNegotiation project={mockProject} onBack={mockOnBack} />
      </MockAuthProvider>
    );

    // Проверяем наличие элементов прогресса
    expect(screen.getByText(/прогресс/i)).toBeInTheDocument();
  });
});



