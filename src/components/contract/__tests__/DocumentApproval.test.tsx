import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentApproval } from '../DocumentApproval';
import { ProjectDocument } from '../../../utils/projectDocumentService';
import { QualificationProtocol } from '../../../utils/qualificationProtocolService';

// Mock данные для документов
const mockCommercialOffer: ProjectDocument = {
  id: 'commercial-offer-1',
  projectId: 'test-project',
  documentType: 'commercial_offer',
  fileName: 'commercial_offer.pdf',
  fileSize: 1024000,
  fileUrl: 'http://test.com/commercial_offer.pdf',
  mimeType: 'application/pdf',
  uploadedBy: 'test-user',
  uploadedAt: new Date('2024-01-01')
};

const mockContract: ProjectDocument = {
  id: 'contract-1',
  projectId: 'test-project',
  documentType: 'contract',
  fileName: 'contract.pdf',
  fileSize: 2048000,
  fileUrl: 'http://test.com/contract.pdf',
  mimeType: 'application/pdf',
  uploadedBy: 'test-user',
  uploadedAt: new Date('2024-01-01')
};

const mockQualificationProtocols: QualificationProtocol[] = [
  {
    id: 'protocol-1',
    projectId: 'test-project',
    qualificationObjectId: 'obj-1',
    qualificationObjectType: 'помещение',
    qualificationObjectName: 'Test Room',
    fileName: 'protocol_room.pdf',
    fileSize: 512000,
    fileUrl: 'http://test.com/protocol_room.pdf',
    mimeType: 'application/pdf',
    uploadedBy: 'test-user',
    uploadedAt: new Date('2024-01-01')
  }
];

const mockApprovedDocuments = new Set(['contract-1']);
const mockDocumentApprovals = new Map();

const mockSelectedQualificationObjects = [
  { id: 'obj-1', type: 'помещение', name: 'Test Room' },
  { id: 'obj-2', type: 'автомобиль', name: 'Test Car' }
];

// Mock функции
const mockOnUpload = jest.fn();
const mockOnDelete = jest.fn();
const mockOnApprove = jest.fn();
const mockOnUnapprove = jest.fn();
const mockOnProjectStatusChange = jest.fn();

describe('DocumentApproval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders document approval component', () => {
    render(
      <DocumentApproval
        commercialOfferDoc={mockCommercialOffer}
        contractDoc={mockContract}
        qualificationProtocols={mockQualificationProtocols}
        approvedDocuments={mockApprovedDocuments}
        documentApprovals={mockDocumentApprovals}
        selectedQualificationObjects={mockSelectedQualificationObjects}
        onUpload={mockOnUpload}
        onDelete={mockOnDelete}
        onApprove={mockOnApprove}
        onUnapprove={mockOnUnapprove}
        onProjectStatusChange={mockOnProjectStatusChange}
        userRole="admin"
      />
    );

    expect(screen.getByText('Коммерческое предложение')).toBeInTheDocument();
    expect(screen.getByText('Договор')).toBeInTheDocument();
    expect(screen.getByText('Протоколы квалификации')).toBeInTheDocument();
  });

  test('displays commercial offer document when uploaded', () => {
    render(
      <DocumentApproval
        commercialOfferDoc={mockCommercialOffer}
        contractDoc={mockContract}
        qualificationProtocols={mockQualificationProtocols}
        approvedDocuments={mockApprovedDocuments}
        documentApprovals={mockDocumentApprovals}
        selectedQualificationObjects={mockSelectedQualificationObjects}
        onUpload={mockOnUpload}
        onDelete={mockOnDelete}
        onApprove={mockOnApprove}
        onUnapprove={mockOnUnapprove}
        onProjectStatusChange={mockOnProjectStatusChange}
        userRole="admin"
      />
    );

    expect(screen.getByText('commercial_offer.pdf')).toBeInTheDocument();
    expect(screen.getByText('1.0 MB')).toBeInTheDocument();
  });

  test('displays contract document when uploaded', () => {
    render(
      <DocumentApproval
        commercialOfferDoc={mockCommercialOffer}
        contractDoc={mockContract}
        qualificationProtocols={mockQualificationProtocols}
        approvedDocuments={mockApprovedDocuments}
        documentApprovals={mockDocumentApprovals}
        selectedQualificationObjects={mockSelectedQualificationObjects}
        onUpload={mockOnUpload}
        onDelete={mockOnDelete}
        onApprove={mockOnApprove}
        onUnapprove={mockOnUnapprove}
        onProjectStatusChange={mockOnProjectStatusChange}
        userRole="admin"
      />
    );

    expect(screen.getByText('contract.pdf')).toBeInTheDocument();
    expect(screen.getByText('2.0 MB')).toBeInTheDocument();
  });

  test('displays qualification protocols', () => {
    render(
      <DocumentApproval
        commercialOfferDoc={mockCommercialOffer}
        contractDoc={mockContract}
        qualificationProtocols={mockQualificationProtocols}
        approvedDocuments={mockApprovedDocuments}
        documentApprovals={mockDocumentApprovals}
        selectedQualificationObjects={mockSelectedQualificationObjects}
        onUpload={mockOnUpload}
        onDelete={mockOnDelete}
        onApprove={mockOnApprove}
        onUnapprove={mockOnUnapprove}
        onProjectStatusChange={mockOnProjectStatusChange}
        userRole="admin"
      />
    );

    expect(screen.getByText('Test Room')).toBeInTheDocument();
    expect(screen.getByText('protocol_room.pdf')).toBeInTheDocument();
  });

  test('shows upload buttons when documents are not uploaded', () => {
    render(
      <DocumentApproval
        commercialOfferDoc={undefined}
        contractDoc={undefined}
        qualificationProtocols={[]}
        approvedDocuments={new Set()}
        documentApprovals={new Map()}
        selectedQualificationObjects={mockSelectedQualificationObjects}
        onUpload={mockOnUpload}
        onDelete={mockOnDelete}
        onApprove={mockOnApprove}
        onUnapprove={mockOnUnapprove}
        onProjectStatusChange={mockOnProjectStatusChange}
        userRole="admin"
      />
    );

    const uploadButtons = screen.getAllByText(/загрузить/i);
    expect(uploadButtons.length).toBeGreaterThan(0);
  });

  test('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <DocumentApproval
        commercialOfferDoc={mockCommercialOffer}
        contractDoc={mockContract}
        qualificationProtocols={mockQualificationProtocols}
        approvedDocuments={mockApprovedDocuments}
        documentApprovals={mockDocumentApprovals}
        selectedQualificationObjects={mockSelectedQualificationObjects}
        onUpload={mockOnUpload}
        onDelete={mockOnDelete}
        onApprove={mockOnApprove}
        onUnapprove={mockOnUnapprove}
        onProjectStatusChange={mockOnProjectStatusChange}
        userRole="admin"
      />
    );

    const deleteButtons = screen.getAllByTitle(/удалить/i);
    await user.click(deleteButtons[0]);

    expect(mockOnDelete).toHaveBeenCalledWith('commercial-offer-1');
  });

  test('calls onApprove when approve button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <DocumentApproval
        commercialOfferDoc={mockCommercialOffer}
        contractDoc={mockContract}
        qualificationProtocols={mockQualificationProtocols}
        approvedDocuments={new Set()}
        documentApprovals={mockDocumentApprovals}
        selectedQualificationObjects={mockSelectedQualificationObjects}
        onUpload={mockOnUpload}
        onDelete={mockOnDelete}
        onApprove={mockOnApprove}
        onUnapprove={mockOnUnapprove}
        onProjectStatusChange={mockOnProjectStatusChange}
        userRole="admin"
      />
    );

    const approveButtons = screen.getAllByText(/согласовано/i);
    await user.click(approveButtons[0]);

    expect(mockOnApprove).toHaveBeenCalled();
  });

  test('shows comments sections for documents', () => {
    render(
      <DocumentApproval
        commercialOfferDoc={mockCommercialOffer}
        contractDoc={mockContract}
        qualificationProtocols={mockQualificationProtocols}
        approvedDocuments={mockApprovedDocuments}
        documentApprovals={mockDocumentApprovals}
        selectedQualificationObjects={mockSelectedQualificationObjects}
        onUpload={mockOnUpload}
        onDelete={mockOnDelete}
        onApprove={mockOnApprove}
        onUnapprove={mockOnUnapprove}
        onProjectStatusChange={mockOnProjectStatusChange}
        userRole="admin"
      />
    );

    expect(screen.getAllByText(/комментарии к согласованию/i).length).toBeGreaterThan(0);
  });

  test('displays file size correctly', () => {
    render(
      <DocumentApproval
        commercialOfferDoc={mockCommercialOffer}
        contractDoc={mockContract}
        qualificationProtocols={mockQualificationProtocols}
        approvedDocuments={mockApprovedDocuments}
        documentApprovals={mockDocumentApprovals}
        selectedQualificationObjects={mockSelectedQualificationObjects}
        onUpload={mockOnUpload}
        onDelete={mockOnDelete}
        onApprove={mockOnApprove}
        onUnapprove={mockOnUnapprove}
        onProjectStatusChange={mockOnProjectStatusChange}
        userRole="admin"
      />
    );

    expect(screen.getByText('1.0 MB')).toBeInTheDocument();
    expect(screen.getByText('2.0 MB')).toBeInTheDocument();
    expect(screen.getByText('512.0 KB')).toBeInTheDocument();
  });
});























