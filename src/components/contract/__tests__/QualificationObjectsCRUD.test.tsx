import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QualificationObjectsCRUD } from '../QualificationObjectsCRUD';
import { QualificationObject } from '../../../types/QualificationObject';

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
    registrationNumber: 'A123BC',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

jest.mock('../../../utils/qualificationObjectService', () => ({
  qualificationObjectService: {
    getQualificationObjectsByContractor: jest.fn(() => Promise.resolve(mockQualificationObjects)),
    getQualificationObjectById: jest.fn((id: string) => {
      const match = mockQualificationObjects.find(obj => obj.id === id);
      return Promise.resolve(match);
    }),
    updateQualificationObject: jest.fn((id: string) => {
      const match = mockQualificationObjects.find(obj => obj.id === id);
      return Promise.resolve(match);
    })
  }
}));

describe('QualificationObjectsCRUD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders qualification objects header', () => {
    render(
      <QualificationObjectsCRUD
        contractorId="test-contractor"
        contractorName="Test Contractor"
      />
    );

    expect(screen.getByText('Объекты квалификации')).toBeInTheDocument();
  });

  test('displays qualification objects after load', async () => {
    render(
      <QualificationObjectsCRUD
        contractorId="test-contractor"
        contractorName="Test Contractor"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Room')).toBeInTheDocument();
      expect(screen.getByText('Test Car')).toBeInTheDocument();
      expect(screen.getByText('Помещение')).toBeInTheDocument();
      expect(screen.getByText('Автомобиль')).toBeInTheDocument();
    });
  });

  test('shows object details in table', async () => {
    render(
      <QualificationObjectsCRUD
        contractorId="test-contractor"
        contractorName="Test Contractor"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Площадь: 100/)).toBeInTheDocument();
      expect(screen.getByText(/Адрес: Test Address/)).toBeInTheDocument();
      expect(screen.getByText(/VIN: TEST123456789/)).toBeInTheDocument();
      expect(screen.getByText(/Регистрационный номер: A123BC/)).toBeInTheDocument();
    });
  });

  test('allows selecting objects', async () => {
    const user = userEvent.setup();

    render(
      <QualificationObjectsCRUD
        contractorId="test-contractor"
        contractorName="Test Contractor"
      />
    );

    const selectButtons = await screen.findAllByTitle('Выбрать объект');
    await user.click(selectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Выбрано объектов: 1/)).toBeInTheDocument();
    });
  });

  test('opens view form when view button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <QualificationObjectsCRUD
        contractorId="test-contractor"
        contractorName="Test Contractor"
      />
    );

    const viewButtons = await screen.findAllByTitle('Просмотреть объект квалификации');
    await user.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Просмотр объекта квалификации')).toBeInTheDocument();
    });
  });
});
