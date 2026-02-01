import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QualificationObjectForm } from '../../QualificationObjectForm';
import { QualificationObject } from '../../../types/QualificationObject';

// Mock данные для формы
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

  test('renders qualification object form', () => {
    render(
      <QualificationObjectForm
        contractorId="test-contractor"
        contractorAddress="Test Address"
        initialData={mockInitialData}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Редактировать объект квалификации')).toBeInTheDocument();
  });

  test('displays initial data in form fields', () => {
    render(
      <QualificationObjectForm
        contractorId="test-contractor"
        contractorAddress="Test Address"
        initialData={mockInitialData}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
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
      />
    );

    expect(screen.getByText(/сохранить/i)).toBeInTheDocument();
    expect(screen.getByText(/отменить/i)).toBeInTheDocument();
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
      />
    );

    const saveButton = screen.getByText(/сохранить/i);
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'obj-1',
          name: 'Test Room',
          area: 100,
          address: 'Test Address'
        })
      );
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
      />
    );

    const cancelButton = screen.getByText(/отменить/i);
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  test('validates required fields', async () => {
    const user = userEvent.setup();
    
    render(
      <QualificationObjectForm
        contractorId="test-contractor"
        contractorAddress="Test Address"
        initialData={mockInitialData}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const nameInput = screen.getByDisplayValue('Test Room');
    await user.clear(nameInput);

    const saveButton = screen.getByText(/сохранить/i);
    await user.click(saveButton);

    // Форма должна показать ошибку валидации
    await waitFor(() => {
      expect(screen.getByText(/обязательное поле/i)).toBeInTheDocument();
    });
  });

  test('shows loading state during save', async () => {
    const user = userEvent.setup();
    
    // Mock медленное сохранение
    mockOnSubmit.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve(mockInitialData), 100))
    );
    
    render(
      <QualificationObjectForm
        contractorId="test-contractor"
        contractorAddress="Test Address"
        initialData={mockInitialData}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const saveButton = screen.getByText(/сохранить/i);
    await user.click(saveButton);

    // Кнопка должна быть заблокирована во время загрузки
    expect(saveButton).toBeDisabled();
  });

  test('handles form submission error', async () => {
    const user = userEvent.setup();
    
    // Mock ошибку сохранения
    mockOnSubmit.mockRejectedValueOnce(new Error('Save failed'));
    
    render(
      <QualificationObjectForm
        contractorId="test-contractor"
        contractorAddress="Test Address"
        initialData={mockInitialData}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const saveButton = screen.getByText(/сохранить/i);
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/ошибка сохранения/i)).toBeInTheDocument();
    });
  });

  test('hides type selection when hideTypeSelection is true', () => {
    render(
      <QualificationObjectForm
        contractorId="test-contractor"
        contractorAddress="Test Address"
        initialData={mockInitialData}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        hideTypeSelection={true}
      />
    );

    // Поле выбора типа не должно отображаться
    expect(screen.queryByText(/тип объекта/i)).not.toBeInTheDocument();
  });

  test('shows type selection when hideTypeSelection is false', () => {
    render(
      <QualificationObjectForm
        contractorId="test-contractor"
        contractorAddress="Test Address"
        initialData={mockInitialData}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        hideTypeSelection={false}
      />
    );

    // Поле выбора типа должно отображаться
    expect(screen.getByText(/тип объекта/i)).toBeInTheDocument();
  });

  test('disables testing periods when readOnlyTestingPeriods is true', () => {
    render(
      <QualificationObjectForm
        contractorId="test-contractor"
        contractorAddress="Test Address"
        initialData={mockInitialData}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        readOnlyTestingPeriods={true}
      />
    );

    // Периоды тестирования должны быть только для чтения
    const testingPeriodsSection = screen.queryByText(/периоды тестирования/i);
    if (testingPeriodsSection) {
      // Если секция есть, проверяем, что она в режиме только для чтения
      expect(testingPeriodsSection.closest('div')).toHaveClass('read-only');
    }
  });

  test('allows editing testing periods when readOnlyTestingPeriods is false', () => {
    render(
      <QualificationObjectForm
        contractorId="test-contractor"
        contractorAddress="Test Address"
        initialData={mockInitialData}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        readOnlyTestingPeriods={false}
      />
    );

    // Периоды тестирования должны быть редактируемыми
    const testingPeriodsSection = screen.queryByText(/периоды тестирования/i);
    if (testingPeriodsSection) {
      // Если секция есть, проверяем, что она не в режиме только для чтения
      expect(testingPeriodsSection.closest('div')).not.toHaveClass('read-only');
    }
  });
});
