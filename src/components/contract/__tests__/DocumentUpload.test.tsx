import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentUpload } from '../DocumentUpload';

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

// Mock для projectDocumentService
jest.mock('../../../utils/projectDocumentService', () => ({
  projectDocumentService: {
    uploadDocument: jest.fn(() => Promise.resolve({
      id: 'doc-1',
      projectId: 'test-project',
      documentType: 'contract',
      fileName: 'test.pdf',
      fileSize: 1024000,
      fileUrl: 'http://test.com/test.pdf',
      mimeType: 'application/pdf',
      uploadedBy: 'test-user',
      uploadedAt: new Date()
    }))
  }
}));

describe('DocumentUpload', () => {
  const mockOnUpload = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders document upload component', () => {
    render(
      <DocumentUpload
        title="Договор"
        document={undefined}
        onUpload={mockOnUpload}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Договор')).toBeInTheDocument();
  });

  test('shows upload button when no document', () => {
    render(
      <DocumentUpload
        title="Договор"
        document={undefined}
        onUpload={mockOnUpload}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(/выбрать файл/i)).toBeInTheDocument();
  });

  test('shows document info when document is uploaded', () => {
    const mockDocument = {
      id: 'doc-1',
      projectId: 'test-project',
      documentType: 'contract' as const,
      fileName: 'contract.pdf',
      fileSize: 1024000,
      fileUrl: 'http://test.com/contract.pdf',
      mimeType: 'application/pdf',
      uploadedBy: 'test-user',
      uploadedAt: new Date()
    };

    render(
      <DocumentUpload
        title="Договор"
        document={mockDocument}
        onUpload={mockOnUpload}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('contract.pdf')).toBeInTheDocument();
  });

  test('handles file upload', async () => {
    const user = userEvent.setup();
    
    render(
      <DocumentUpload
        title="Договор"
        document={undefined}
        onUpload={mockOnUpload}
        onDelete={mockOnDelete}
      />
    );

    const fileInput = screen.getByLabelText(/выбрать файл/i);
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith(file);
    });
  });

  test('shows download button for uploaded document', () => {
    const mockDocument = {
      id: 'doc-1',
      projectId: 'test-project',
      documentType: 'contract' as const,
      fileName: 'contract.pdf',
      fileSize: 1024000,
      fileUrl: 'http://test.com/contract.pdf',
      mimeType: 'application/pdf',
      uploadedBy: 'test-user',
      uploadedAt: new Date()
    };

    render(
      <DocumentUpload
        title="Договор"
        document={mockDocument}
        onUpload={mockOnUpload}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByTitle(/скачать/i)).toBeInTheDocument();
  });


  test('shows delete button for uploaded document', () => {
    const mockDocument = {
      id: 'doc-1',
      projectId: 'test-project',
      documentType: 'contract' as const,
      fileName: 'contract.pdf',
      fileSize: 1024000,
      fileUrl: 'http://test.com/contract.pdf',
      mimeType: 'application/pdf',
      uploadedBy: 'test-user',
      uploadedAt: new Date()
    };

    render(
      <DocumentUpload
        title="Договор"
        document={mockDocument}
        onUpload={mockOnUpload}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByTitle(/удалить/i)).toBeInTheDocument();
  });

  test('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    
    const mockDocument = {
      id: 'doc-1',
      projectId: 'test-project',
      documentType: 'contract' as const,
      fileName: 'contract.pdf',
      fileSize: 1024000,
      fileUrl: 'http://test.com/contract.pdf',
      mimeType: 'application/pdf',
      uploadedBy: 'test-user',
      uploadedAt: new Date()
    };

    render(
      <DocumentUpload
        title="Договор"
        document={mockDocument}
        onUpload={mockOnUpload}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = screen.getByTitle(/удалить/i);
    await user.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith('doc-1');
  });

  test('shows loading state during upload', async () => {
    const user = userEvent.setup();
    
    // Mock медленная загрузка
    mockOnUpload.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );
    
    render(
      <DocumentUpload
        title="Договор"
        document={undefined}
        onUpload={mockOnUpload}
        onDelete={mockOnDelete}
      />
    );

    const fileInput = screen.getByLabelText(/выбрать файл/i);
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    
    await user.upload(fileInput, file);

    expect(screen.getByText(/загрузка/i)).toBeInTheDocument();
  });

  test('handles upload error', async () => {
    const user = userEvent.setup();
    
    // Mock ошибка загрузки
    mockOnUpload.mockRejectedValueOnce(new Error('Upload failed'));
    
    render(
      <DocumentUpload
        title="Договор"
        document={undefined}
        onUpload={mockOnUpload}
        onDelete={mockOnDelete}
      />
    );

    const fileInput = screen.getByLabelText(/выбрать файл/i);
    const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText(/ошибка загрузки/i)).toBeInTheDocument();
    });
  });

  test('displays correct document type labels', () => {
    const documentTypes = [
      { type: 'commercial_offer', label: 'Коммерческое предложение' },
      { type: 'contract', label: 'Договор' },
      { type: 'qualification_protocol', label: 'Протокол квалификации' }
    ];

    documentTypes.forEach(({ type, label }) => {
      const { unmount } = render(
        <DocumentUpload
          title={label}
          document={undefined}
          onUpload={mockOnUpload}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    });
  });
});



