import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentApprovalActions } from '../DocumentApprovalActions';

// Mock для AuthContext
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User'
};

// Mock для useAuth
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser
  })
}));

// Mock для documentApprovalService
jest.mock('../../../utils/documentApprovalService', () => ({
  documentApprovalService: {
    getApprovalHistory: jest.fn(() => Promise.resolve([])),
    approveDocument: jest.fn(() => Promise.resolve({
      id: 'approval-1',
      documentId: 'test-doc',
      userId: 'test-user-id',
      userName: 'Test User',
      status: 'approved',
      createdAt: new Date()
    })),
    rejectDocument: jest.fn(() => Promise.resolve({
      id: 'approval-1',
      documentId: 'test-doc',
      userId: 'test-user-id',
      userName: 'Test User',
      status: 'rejected',
      createdAt: new Date()
    }))
  }
}));

describe('DocumentApprovalActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders approval actions component', () => {
    render(
      <DocumentApprovalActions
        documentId="test-doc"
        documentType="contract"
        currentStatus="pending"
      />
    );

    // Проверяем, что нет надписи "Согласовано" (убрана по требованию)
    expect(screen.queryByText(/согласовано/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ожидает согласования/i)).not.toBeInTheDocument();
  });

  test('shows approve button for pending documents', () => {
    render(
      <DocumentApprovalActions
        documentId="test-doc"
        documentType="contract"
        currentStatus="pending"
      />
    );

    const approveButton = screen.getByText(/согласовано/i);
    expect(approveButton).toBeInTheDocument();
  });

  test('shows cancel approval button for approved documents', () => {
    render(
      <DocumentApprovalActions
        documentId="test-doc"
        documentType="contract"
        currentStatus="approved"
      />
    );

    const cancelButton = screen.getByText(/отменить согласование/i);
    expect(cancelButton).toBeInTheDocument();
  });

  test('shows rejection message for rejected documents', () => {
    render(
      <DocumentApprovalActions
        documentId="test-doc"
        documentType="contract"
        currentStatus="rejected"
      />
    );

    expect(screen.getByText(/документ отклонен/i)).toBeInTheDocument();
  });

  test('calls onStatusChange when approve button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnStatusChange = jest.fn();
    
    render(
      <DocumentApprovalActions
        documentId="test-doc"
        documentType="contract"
        currentStatus="pending"
        onStatusChange={mockOnStatusChange}
      />
    );

    const approveButton = screen.getByText(/согласовано/i);
    await user.click(approveButton);

    await waitFor(() => {
      expect(mockOnStatusChange).toHaveBeenCalledWith('approved', undefined);
    });
  });

  test('calls onStatusChange when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnStatusChange = jest.fn();
    
    render(
      <DocumentApprovalActions
        documentId="test-doc"
        documentType="contract"
        currentStatus="approved"
        onStatusChange={mockOnStatusChange}
      />
    );

    const cancelButton = screen.getByText(/отменить согласование/i);
    await user.click(cancelButton);

    await waitFor(() => {
      expect(mockOnStatusChange).toHaveBeenCalledWith('pending', undefined);
    });
  });

  test('disables cancel button when isCancelBlocked is true', () => {
    render(
      <DocumentApprovalActions
        documentId="test-doc"
        documentType="contract"
        currentStatus="approved"
        isCancelBlocked={true}
      />
    );

    const cancelButton = screen.getByText(/отменить согласование/i);
    expect(cancelButton).toBeDisabled();
  });

  test('shows blocked message when cancel is blocked', () => {
    render(
      <DocumentApprovalActions
        documentId="test-doc"
        documentType="contract"
        currentStatus="approved"
        isCancelBlocked={true}
      />
    );

    expect(screen.getByText(/отмена согласования заблокирована/i)).toBeInTheDocument();
  });

  test('displays approval history when available', async () => {
    const mockHistory = [
      {
        id: 'approval-1',
        documentId: 'test-doc',
        userId: 'user-1',
        userName: 'John Doe',
        status: 'approved' as const,
        comment: 'Document approved',
        createdAt: new Date('2024-01-01')
      }
    ];

    const { documentApprovalService } = require('../../../utils/documentApprovalService');
    documentApprovalService.getApprovalHistory.mockResolvedValueOnce(mockHistory);

    render(
      <DocumentApprovalActions
        documentId="test-doc"
        documentType="contract"
        currentStatus="approved"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('История согласований')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Document approved')).toBeInTheDocument();
    });
  });

  test('handles approval error gracefully', async () => {
    const user = userEvent.setup();
    const mockOnStatusChange = jest.fn();
    
    // Mock error in approveDocument
    const { documentApprovalService } = require('../../../utils/documentApprovalService');
    documentApprovalService.approveDocument.mockRejectedValueOnce(new Error('Network error'));
    
    render(
      <DocumentApprovalActions
        documentId="test-doc"
        documentType="contract"
        currentStatus="pending"
        onStatusChange={mockOnStatusChange}
      />
    );

    const approveButton = screen.getByText(/согласовано/i);
    await user.click(approveButton);

    // Should still call onStatusChange as fallback
    await waitFor(() => {
      expect(mockOnStatusChange).toHaveBeenCalledWith('approved', undefined);
    });
  });

  test('shows loading state during approval', async () => {
    const user = userEvent.setup();
    
    // Mock slow approval
    const { documentApprovalService } = require('../../../utils/documentApprovalService');
    documentApprovalService.approveDocument.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({
        id: 'approval-1',
        documentId: 'test-doc',
        userId: 'test-user-id',
        userName: 'Test User',
        status: 'approved',
        createdAt: new Date()
      }), 100))
    );
    
    render(
      <DocumentApprovalActions
        documentId="test-doc"
        documentType="contract"
        currentStatus="pending"
      />
    );

    const approveButton = screen.getByText(/согласовано/i);
    await user.click(approveButton);

    // Button should be disabled during loading
    expect(approveButton).toBeDisabled();
  });
});























