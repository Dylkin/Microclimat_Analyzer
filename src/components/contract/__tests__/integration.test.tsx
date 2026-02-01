import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContractNegotiation } from '../../ContractNegotiation';
import { Project } from '../../../types/Project';

// Mock для AuthContext
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'admin'
};

const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div data-testid="auth-provider">{children}</div>
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
    }
  ]
};

describe('Contract Negotiation Integration Tests', () => {
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('complete document approval workflow', async () => {
    const user = userEvent.setup();
    
    render(
      <MockAuthProvider>
        <ContractNegotiation project={mockProject} onBack={mockOnBack} />
      </MockAuthProvider>
    );

    // 1. Проверяем, что страница загрузилась
    expect(screen.getByText('Согласование договора')).toBeInTheDocument();
    expect(screen.getByText('Test Project')).toBeInTheDocument();

    // 2. Проверяем наличие секций документов
    expect(screen.getByText('Коммерческое предложение')).toBeInTheDocument();
    expect(screen.getByText('Договор')).toBeInTheDocument();
    expect(screen.getByText('Протоколы квалификации')).toBeInTheDocument();

    // 3. Проверяем наличие объектов квалификации
    expect(screen.getByText('Test Room')).toBeInTheDocument();
    expect(screen.getByText('Помещение')).toBeInTheDocument();

    // 4. Проверяем, что нет надписей "Согласовано" (убраны по требованию)
    expect(screen.queryByText(/согласовано/i)).not.toBeInTheDocument();
  });

  test('qualification object selection and editing workflow', async () => {
    const user = userEvent.setup();
    
    render(
      <MockAuthProvider>
        <ContractNegotiation project={mockProject} onBack={mockOnBack} />
      </MockAuthProvider>
    );

    // 1. Проверяем наличие чекбоксов для выбора объектов
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);

    // 2. Выбираем объект
    await user.click(checkboxes[0]);
    expect(checkboxes[0]).toBeChecked();

    // 3. Проверяем, что объект появился в списке выбранных
    await waitFor(() => {
      expect(screen.getByText('Выбранные объекты:')).toBeInTheDocument();
    });

    // 4. Проверяем наличие кнопки редактирования
    const editButtons = screen.getAllByTitle(/редактировать/i);
    expect(editButtons.length).toBeGreaterThan(0);

    // 5. Нажимаем кнопку редактирования
    await user.click(editButtons[0]);

    // 6. Проверяем, что открылась форма редактирования
    await waitFor(() => {
      expect(screen.getByText('Редактировать объект квалификации')).toBeInTheDocument();
    });
  });

  test('document upload and approval workflow', async () => {
    const user = userEvent.setup();
    
    render(
      <MockAuthProvider>
        <ContractNegotiation project={mockProject} onBack={mockOnBack} />
      </MockAuthProvider>
    );

    // 1. Проверяем наличие кнопок загрузки
    const uploadButtons = screen.getAllByText(/загрузить/i);
    expect(uploadButtons.length).toBeGreaterThan(0);

    // 2. Проверяем наличие секций комментариев
    const commentSections = screen.getAllByText(/комментарии к согласованию/i);
    expect(commentSections.length).toBeGreaterThan(0);

    // 3. Проверяем, что нет автоматических комментариев
    expect(screen.queryByText('Иванов И.И.')).not.toBeInTheDocument();
    expect(screen.queryByText('Петров П.П.')).not.toBeInTheDocument();
  });

  test('comments functionality', async () => {
    const user = userEvent.setup();
    
    render(
      <MockAuthProvider>
        <ContractNegotiation project={mockProject} onBack={mockOnBack} />
      </MockAuthProvider>
    );

    // 1. Находим поле для ввода комментария
    const commentInputs = screen.getAllByPlaceholderText(/добавить комментарий/i);
    expect(commentInputs.length).toBeGreaterThan(0);

    // 2. Вводим комментарий
    await user.type(commentInputs[0], 'Test comment');

    // 3. Проверяем, что кнопка отправки стала активной
    const sendButtons = screen.getAllByText(/отправить/i);
    expect(sendButtons[0]).not.toBeDisabled();

    // 4. Отправляем комментарий
    await user.click(sendButtons[0]);

    // 5. Проверяем, что комментарий появился
    await waitFor(() => {
      expect(screen.getByText('Test comment')).toBeInTheDocument();
    });
  });

  test('approval actions workflow', async () => {
    const user = userEvent.setup();
    
    render(
      <MockAuthProvider>
        <ContractNegotiation project={mockProject} onBack={mockOnBack} />
      </MockAuthProvider>
    );

    // 1. Проверяем наличие кнопок согласования
    const approveButtons = screen.getAllByText(/согласовано/i);
    expect(approveButtons.length).toBeGreaterThan(0);

    // 2. Нажимаем кнопку согласования
    await user.click(approveButtons[0]);

    // 3. Проверяем, что появилась кнопка отмены согласования
    await waitFor(() => {
      const cancelButtons = screen.getAllByText(/отменить согласование/i);
      expect(cancelButtons.length).toBeGreaterThan(0);
    });
  });

  test('navigation and back functionality', async () => {
    const user = userEvent.setup();
    
    render(
      <MockAuthProvider>
        <ContractNegotiation project={mockProject} onBack={mockOnBack} />
      </MockAuthProvider>
    );

    // 1. Проверяем наличие кнопки "Назад"
    const backButton = screen.getByRole('button', { name: /назад/i });
    expect(backButton).toBeInTheDocument();

    // 2. Нажимаем кнопку "Назад"
    await user.click(backButton);

    // 3. Проверяем, что вызвался callback
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  test('progress tracking', () => {
    render(
      <MockAuthProvider>
        <ContractNegotiation project={mockProject} onBack={mockOnBack} />
      </MockAuthProvider>
    );

    // Проверяем наличие элементов прогресса
    expect(screen.getByText(/прогресс/i)).toBeInTheDocument();
  });

  test('error handling for missing data', () => {
    const projectWithoutObjects: Project = {
      ...mockProject,
      qualificationObjects: []
    };

    render(
      <MockAuthProvider>
        <ContractNegotiation project={projectWithoutObjects} onBack={mockOnBack} />
      </MockAuthProvider>
    );

    // Проверяем, что приложение не падает при отсутствии объектов
    expect(screen.getByText('Согласование договора')).toBeInTheDocument();
    expect(screen.getByText('Объекты квалификации не найдены')).toBeInTheDocument();
  });

  test('responsive layout elements', () => {
    render(
      <MockAuthProvider>
        <ContractNegotiation project={mockProject} onBack={mockOnBack} />
      </MockAuthProvider>
    );

    // Проверяем наличие основных элементов интерфейса
    expect(screen.getByText('Согласование договора')).toBeInTheDocument();
    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('Test Contractor')).toBeInTheDocument();
    
    // Проверяем наличие таблиц и форм
    const tables = screen.getAllByRole('table');
    expect(tables.length).toBeGreaterThan(0);
  });
});



