import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QualificationObjectsCRUD } from '../QualificationObjectsCRUD';
import { QualificationObject } from '../../../types/QualificationObject';

// Mock для qualificationObjectService
jest.mock('../../../utils/qualificationObjectService', () => ({
  qualificationObjectService: {
    getQualificationObjects: jest.fn(() => Promise.resolve([])),
    createQualificationObject: jest.fn(() => Promise.resolve({
      id: 'new-obj-1',
      contractorId: 'test-contractor',
      type: 'помещение',
      name: 'New Room',
      area: 100,
      address: 'New Address',
      createdAt: new Date(),
      updatedAt: new Date()
    })),
    updateQualificationObject: jest.fn(() => Promise.resolve({
      id: 'obj-1',
      contractorId: 'test-contractor',
      type: 'помещение',
      name: 'Updated Room',
      area: 150,
      address: 'Updated Address',
      createdAt: new Date(),
      updatedAt: new Date()
    })),
    deleteQualificationObject: jest.fn(() => Promise.resolve())
  }
}));

// Mock данные для объектов квалификации
const mockQualificationObjects: QualificationObject[] = [
  {
    id: 'obj-1',
    contractorId: 'test-contractor',
    type: 'помещение',
    name: 'Test Room',
    area: 100,
    address: 'Test Address',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'obj-2',
    contractorId: 'test-contractor',
    type: 'автомобиль',
    name: 'Test Car',
    vin: 'TEST123456789',
    model: 'Test Model',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

const mockProjectQualificationObjects = [
  {
    qualificationObjectId: 'obj-1',
    qualificationObjectType: 'помещение',
    qualificationObjectName: 'Test Room'
  },
  {
    qualificationObjectId: 'obj-2',
    qualificationObjectType: 'автомобиль',
    qualificationObjectName: 'Test Car'
  }
];

describe('QualificationObjectsCRUD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders qualification objects CRUD component', () => {
    render(
      <QualificationObjectsCRUD
        contractorId="test-contractor"
        contractorName="Test Contractor"
        projectId="test-project"
        projectQualificationObjects={mockProjectQualificationObjects}
      />
    );

    expect(screen.getByText('Объекты квалификации')).toBeInTheDocument();
    expect(screen.getByText('Test Contractor')).toBeInTheDocument();
  });

  test('displays qualification objects', () => {
    render(
      <QualificationObjectsCRUD
        contractorId="test-contractor"
        contractorName="Test Contractor"
        projectId="test-project"
        projectQualificationObjects={mockProjectQualificationObjects}
      />
    );

    expect(screen.getByText('Test Room')).toBeInTheDocument();
    expect(screen.getByText('Test Car')).toBeInTheDocument();
    expect(screen.getByText('Помещение')).toBeInTheDocument();
    expect(screen.getByText('Автомобиль')).toBeInTheDocument();
  });

  test('shows object details correctly', () => {
    render(
      <QualificationObjectsCRUD
        contractorId="test-contractor"
        contractorName="Test Contractor"
        projectId="test-project"
        projectQualificationObjects={mockProjectQualificationObjects}
      />
    );

    expect(screen.getByText('100 м²')).toBeInTheDocument();
    expect(screen.getByText('Test Address')).toBeInTheDocument();
    expect(screen.getByText('TEST123456789')).toBeInTheDocument();
    expect(screen.getByText('Test Model')).toBeInTheDocument();
  });

  test('displays edit buttons for objects', () => {
    render(
      <QualificationObjectsCRUD
        contractorId="test-contractor"
        contractorName="Test Contractor"
        projectId="test-project"
        projectQualificationObjects={mockProjectQualificationObjects}
      />
    );

    const editButtons = screen.getAllByTitle(/редактировать/i);
    expect(editButtons.length).toBeGreaterThan(0);
  });

  test('opens edit form when edit button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <QualificationObjectsCRUD
        contractorId="test-contractor"
        contractorName="Test Contractor"
        projectId="test-project"
        projectQualificationObjects={mockProjectQualificationObjects}
      />
    );

    const editButtons = screen.getAllByTitle(/редактировать/i);
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Редактировать объект квалификации')).toBeInTheDocument();
    });
  });

  test('shows checkboxes for object selection', () => {
    render(
      <QualificationObjectsCRUD
        contractorId="test-contractor"
        contractorName="Test Contractor"
        projectId="test-project"
        projectQualificationObjects={mockProjectQualificationObjects}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  test('allows selecting objects with checkboxes', async () => {
    const user = userEvent.setup();
    
    render(
      <QualificationObjectsCRUD
        contractorId="test-contractor"
        contractorName="Test Contractor"
        projectId="test-project"
        projectQualificationObjects={mockProjectQualificationObjects}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);

    // Проверяем, что объект выбран
    expect(checkboxes[0]).toBeChecked();
  });

  test('disables checkboxes when isCheckboxesBlocked is true', () => {
    render(
      <QualificationObjectsCRUD
        contractorId="test-contractor"
        contractorName="Test Contractor"
        projectId="test-project"
        projectQualificationObjects={mockProjectQualificationObjects}
        isCheckboxesBlocked={true}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(checkbox => {
      expect(checkbox).toBeDisabled();
    });
  });

  test('shows selected objects summary', async () => {
    const user = userEvent.setup();
    
    render(
      <QualificationObjectsCRUD
        contractorId="test-contractor"
        contractorName="Test Contractor"
        projectId="test-project"
        projectQualificationObjects={mockProjectQualificationObjects}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);

    await waitFor(() => {
      expect(screen.getByText('Выбранные объекты:')).toBeInTheDocument();
      expect(screen.getByText('Test Room')).toBeInTheDocument();
    });
  });

  test('shows empty state when no objects', () => {
    render(
      <QualificationObjectsCRUD
        contractorId="test-contractor"
        contractorName="Test Contractor"
        projectId="test-project"
        projectQualificationObjects={[]}
      />
    );

    expect(screen.getByText('Объекты квалификации не найдены')).toBeInTheDocument();
  });

  test('handles object selection correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <QualificationObjectsCRUD
        contractorId="test-contractor"
        contractorName="Test Contractor"
        projectId="test-project"
        projectQualificationObjects={mockProjectQualificationObjects}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    
    // Выбираем первый объект
    await user.click(checkboxes[0]);
    expect(checkboxes[0]).toBeChecked();
    
    // Выбираем второй объект
    await user.click(checkboxes[1]);
    expect(checkboxes[1]).toBeChecked();
    
    // Отменяем выбор первого объекта
    await user.click(checkboxes[0]);
    expect(checkboxes[0]).not.toBeChecked();
    expect(checkboxes[1]).toBeChecked();
  });

  test('shows correct object types', () => {
    render(
      <QualificationObjectsCRUD
        contractorId="test-contractor"
        contractorName="Test Contractor"
        projectId="test-project"
        projectQualificationObjects={mockProjectQualificationObjects}
      />
    );

    expect(screen.getByText('Помещение')).toBeInTheDocument();
    expect(screen.getByText('Автомобиль')).toBeInTheDocument();
  });

  test('displays object counts correctly', () => {
    render(
      <QualificationObjectsCRUD
        contractorId="test-contractor"
        contractorName="Test Contractor"
        projectId="test-project"
        projectQualificationObjects={mockProjectQualificationObjects}
      />
    );

    // Проверяем, что отображается правильное количество объектов
    const tableRows = screen.getAllByRole('row');
    // -1 для заголовка таблицы
    expect(tableRows.length - 1).toBe(mockProjectQualificationObjects.length);
  });
});























