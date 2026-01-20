import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QualificationObjectForm } from '../../QualificationObjectForm';
import { QualificationObject } from '../../../types/QualificationObject';

const mockInitialData: QualificationObject = {
  id: 'obj-1',
  contractorId: 'test-contractor',
  type: 'помещение',
  name: 'Test Room',
  area: 100,
  address: 'Test Address',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
};

const mockOnSubmit = jest.fn().mockResolvedValue(mockInitialData);
const mockOnCancel = jest.fn();

describe('QualificationObjectForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders qualification object form fields', () => {
    render(
      <QualificationObjectForm
        contractorId="test-contractor"
        contractorAddress="Test Address"
        initialData={mockInitialData}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        mode="edit"
      />
    );

    expect(screen.getByText('Тип объекта *')).toBeInTheDocument();
    expect(screen.getByText('Общая информация')).toBeInTheDocument();
  });

  test('displays initial data in form fields', () => {
    render(
      <QualificationObjectForm
        contractorId="test-contractor"
        contractorAddress="Test Address"
        initialData={mockInitialData}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        mode="edit"
      />
    );

    expect(screen.getByDisplayValue('Test Room')).toBeInTheDocument();
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Address')).toBeInTheDocument();
  });

  test('allows editing form fields', async () => {
    const user = userEvent.setup();
    
    render(
      <QualificationObjectForm
        contractorId="test-contractor"
        contractorAddress="Test Address"
        initialData={mockInitialData}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        mode="edit"
      />
    );

    const nameInput = screen.getByDisplayValue('Test Room');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Room');

    expect(nameInput).toHaveValue('Updated Room');
  });

  test('shows save and cancel buttons', () => {
    render(
      <QualificationObjectForm
        contractorId="test-contractor"
        contractorAddress="Test Address"
        initialData={mockInitialData}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        mode="edit"
      />
    );

    expect(screen.getByText(/сохранить/i)).toBeInTheDocument();
    expect(screen.getByText(/отмена/i)).toBeInTheDocument();
  });

  test('calls onSubmit when save button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <QualificationObjectForm
        contractorId="test-contractor"
        contractorAddress="Test Address"
        initialData={mockInitialData}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        mode="edit"
      />
    );

    const saveButton = screen.getByText(/сохранить/i);
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  test('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <QualificationObjectForm
        contractorId="test-contractor"
        contractorAddress="Test Address"
        initialData={mockInitialData}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        mode="edit"
      />
    );

    const cancelButton = screen.getByText(/отмена/i);
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});
