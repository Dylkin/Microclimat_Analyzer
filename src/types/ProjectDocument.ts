export type DocumentType = 'commercial_offer' | 'contract' | 'layout_scheme' | 'test_data';

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
  qualificationObjectId?: string;
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
  file_url: string;
  mime_type: string;
  uploaded_by: string | null;
  uploaded_at: string;
  created_at: string;
}

export const DocumentTypeLabels: Record<DocumentType, string> = {
  'commercial_offer': 'Коммерческое предложение',
  'contract': 'Договор',
  'layout_scheme': 'Схема расстановки',
  'test_data': 'Данные о проведении испытаний'
};

export type DocumentStatus = 'draft' | 'ready_to_send' | 'sent' | 'under_review' | 'approved';

export const DocumentStatusLabels: Record<DocumentStatus, string> = {
  'draft': 'Черновик',
  'ready_to_send': 'Готово к отправке',
  'sent': 'Отправлено',
  'under_review': 'Согласование',
  'approved': 'Согласовано'
};

export const DocumentStatusColors: Record<DocumentStatus, string> = {
  'draft': 'bg-gray-100 text-gray-800',
  'ready_to_send': 'bg-blue-100 text-blue-800',
  'sent': 'bg-yellow-100 text-yellow-800',
  'under_review': 'bg-orange-100 text-orange-800',
  'approved': 'bg-green-100 text-green-800'
};