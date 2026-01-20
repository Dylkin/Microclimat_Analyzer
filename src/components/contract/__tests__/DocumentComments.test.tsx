import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentComments } from '../DocumentComments';

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
    getComments: jest.fn(() => Promise.resolve([])),
    addComment: jest.fn(() => Promise.resolve({
      id: 'comment-1',
      documentId: 'test-doc',
      userId: 'test-user-id',
      userName: 'Test User',
      comment: 'Test comment',
      createdAt: new Date()
    }))
  }
}));

describe('DocumentComments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders comments component', () => {
    render(
      <DocumentComments
        documentId="test-doc"
        documentType="contract"
      />
    );

    expect(screen.getByText('Комментарии к согласованию')).toBeInTheDocument();
    expect(screen.getByText('(0)')).toBeInTheDocument();
  });

  test('shows empty state when no comments', () => {
    render(
      <DocumentComments
        documentId="test-doc"
        documentType="contract"
      />
    );

    expect(screen.getByText('Комментариев пока нет')).toBeInTheDocument();
  });

  test('displays comment input field', () => {
    render(
      <DocumentComments
        documentId="test-doc"
        documentType="contract"
      />
    );

    const textarea = screen.getByPlaceholderText(/добавить комментарий/i);
    expect(textarea).toBeInTheDocument();
    
    const sendButton = screen.getByRole('button', { name: /отправить/i });
    expect(sendButton).toBeInTheDocument();
  });

  test('allows adding new comment', async () => {
    const user = userEvent.setup();
    
    render(
      <DocumentComments
        documentId="test-doc"
        documentType="contract"
      />
    );

    const textarea = screen.getByPlaceholderText(/добавить комментарий/i);
    const sendButton = screen.getByRole('button', { name: /отправить/i });

    await user.type(textarea, 'Test comment');
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Test comment')).toBeInTheDocument();
    });
  });

  test('disables send button when comment is empty', () => {
    render(
      <DocumentComments
        documentId="test-doc"
        documentType="contract"
      />
    );

    const sendButton = screen.getByRole('button', { name: /отправить/i });
    expect(sendButton).toBeDisabled();
  });

  test('enables send button when comment has text', async () => {
    const user = userEvent.setup();
    
    render(
      <DocumentComments
        documentId="test-doc"
        documentType="contract"
      />
    );

    const textarea = screen.getByPlaceholderText(/добавить комментарий/i);
    const sendButton = screen.getByRole('button', { name: /отправить/i });

    await user.type(textarea, 'Test comment');
    
    expect(sendButton).not.toBeDisabled();
  });

  test('clears input after sending comment', async () => {
    const user = userEvent.setup();
    
    render(
      <DocumentComments
        documentId="test-doc"
        documentType="contract"
      />
    );

    const textarea = screen.getByPlaceholderText(/добавить комментарий/i);
    const sendButton = screen.getByRole('button', { name: /отправить/i });

    await user.type(textarea, 'Test comment');
    await user.click(sendButton);

    await waitFor(() => {
      expect(textarea).toHaveValue('');
    });
  });

  test('displays comment with user name and timestamp', async () => {
    const user = userEvent.setup();
    
    render(
      <DocumentComments
        documentId="test-doc"
        documentType="contract"
      />
    );

    const textarea = screen.getByPlaceholderText(/добавить комментарий/i);
    const sendButton = screen.getByRole('button', { name: /отправить/i });

    await user.type(textarea, 'Test comment');
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('Test comment')).toBeInTheDocument();
    });
  });

  test('handles temporary document IDs', async () => {
    const user = userEvent.setup();
    
    render(
      <DocumentComments
        documentId="temp-doc-123"
        documentType="contract"
      />
    );

    const textarea = screen.getByPlaceholderText(/добавить комментарий/i);
    const sendButton = screen.getByRole('button', { name: /отправить/i });

    await user.type(textarea, 'Test comment');
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Test comment')).toBeInTheDocument();
    });
  });

  test('calls onCommentAdd callback when provided', async () => {
    const user = userEvent.setup();
    const mockOnCommentAdd = jest.fn();
    
    render(
      <DocumentComments
        documentId="test-doc"
        documentType="contract"
        onCommentAdd={mockOnCommentAdd}
      />
    );

    const textarea = screen.getByPlaceholderText(/добавить комментарий/i);
    const sendButton = screen.getByRole('button', { name: /отправить/i });

    await user.type(textarea, 'Test comment');
    await user.click(sendButton);

    await waitFor(() => {
      expect(mockOnCommentAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          comment: 'Test comment',
          userName: 'Test User'
        })
      );
    });
  });

  test('handles comment submission error gracefully', async () => {
    const user = userEvent.setup();
    
    // Mock error in addComment
    const { documentApprovalService } = require('../../../utils/documentApprovalService');
    documentApprovalService.addComment.mockRejectedValueOnce(new Error('Network error'));
    
    render(
      <DocumentComments
        documentId="test-doc"
        documentType="contract"
      />
    );

    const textarea = screen.getByPlaceholderText(/добавить комментарий/i);
    const sendButton = screen.getByRole('button', { name: /отправить/i });

    await user.type(textarea, 'Test comment');
    await user.click(sendButton);

    // Should still add comment locally as fallback
    await waitFor(() => {
      expect(screen.getByText('Test comment')).toBeInTheDocument();
    });
  });
});























