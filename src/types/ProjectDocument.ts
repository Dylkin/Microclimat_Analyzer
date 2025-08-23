export type DocumentType = 'commercial_offer' | 'contract';

export interface ProjectDocument {
  id: string;
  projectId: string;
  documentType: DocumentType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy?: string;
  uploadedByName?: string;
  uploadedAt: Date;
  createdAt: Date;
}

export interface CreateProjectDocumentData {
  projectId: string;
  documentType: DocumentType;
  file: File;
  uploadedBy?: string;
}

export interface DatabaseProjectDocument {
  id: string;
  project_id: string;
  document_type: DocumentType;
  file_name: string;
  file_size: number;
  file_content: Uint8Array;
  mime_type: string;
  uploaded_by: string | null;
  uploaded_at: string;
  created_at: string;
}

export const DocumentTypeLabels: Record<DocumentType, string> = {
  'commercial_offer': 'Коммерческое предложение',
  'contract': 'Договор'
};