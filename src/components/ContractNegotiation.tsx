import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, AlertTriangle } from 'lucide-react';
import { Project } from '../types/Project';
import { projectDocumentService, ProjectDocument } from '../utils/projectDocumentService';
import { useAuth } from '../contexts/AuthContext';
import { ProjectInfo } from './contract/ProjectInfo';
import { NegotiationStages } from './contract/NegotiationStages';
import { QualificationObjectsCRUD } from './contract/QualificationObjectsCRUD';
import { DocumentUpload } from './contract/DocumentUpload';
import { StatusSummary } from './contract/StatusSummary';
import { ContractInstructions } from './contract/ContractInstructions';

interface ContractNegotiationProps {
  project: Project;
  onBack: () => void;
}

export const ContractNegotiation: React.FC<ContractNegotiationProps> = ({ project, onBack }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [approvedDocuments, setApprovedDocuments] = useState<Set<string>>(new Set());

  // Безопасная проверка данных проекта
  if (!project || !project.id) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <FileText className="w-8 h-8 text-red-600" />
          <h1 className="text-2xl font-bold text-gray-900">Ошибка загрузки проекта</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-600">Данные проекта не найдены или повреждены</p>
        </div>
      </div>
    );
  }

  // Загрузка документов проекта
  const loadDocuments = async () => {
    if (!projectDocumentService.isAvailable()) {
      setError('Supabase не настроен для работы с документами');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const docs = await projectDocumentService.getProjectDocuments(project.id);
      setDocuments(docs);
    } catch (error) {
      console.error('Ошибка загрузки документов:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [project.id]);

  // Загрузка документа
  const handleFileUpload = async (documentType: 'commercial_offer' | 'contract', file: File) => {
    if (!file) return;

    // Проверяем тип файла
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      alert('Поддерживаются только файлы PDF, DOC и DOCX');
      return;
    }

    setUploading(prev => ({ ...prev, [documentType]: true }));

    try {
      const uploadedDoc = await projectDocumentService.uploadDocument(project.id, documentType, file, user?.id);
      
      // Обновляем список документов
      setDocuments(prev => {
        const filtered = prev.filter(doc => doc.documentType !== documentType);
        return [...filtered, uploadedDoc];
      });

      alert('Документ успешно загружен');
    } catch (error) {
      console.error('Ошибка загрузки документа:', error);
      alert(`Ошибка загрузки документа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setUploading(prev => ({ ...prev, [documentType]: false }));
    }
  };

  // Удаление документа
  const handleDeleteDocument = async (documentId: string, documentType: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот документ?')) {
      return;
    }

    try {
      await projectDocumentService.deleteDocument(documentId);
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      alert('Документ успешно удален');
    } catch (error) {
      console.error('Ошибка удаления документа:', error);
      alert(`Ошибка удаления документа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  // Скачивание документа
  const handleDownloadDocument = async (document: ProjectDocument) => {
    try {
      const blob = await projectDocumentService.downloadDocument(document.fileUrl);
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = document.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Ошибка скачивания документа:', error);
      alert(`Ошибка скачивания документа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  // Просмотр документа
  const handleViewDocument = (document: ProjectDocument) => {
    window.open(document.fileUrl, '_blank');
  };

  // Согласование документа
  const handleApproveDocument = (document: ProjectDocument) => {
    if (confirm(`Вы уверены, что хотите согласовать документ "${document.fileName}"?`)) {
      setApprovedDocuments(prev => new Set([...prev, document.id]));
      alert('Документ успешно согласован');
    }
  };

  // Get documents by type
  const commercialOfferDoc = documents.find(doc => doc.documentType === 'commercial_offer');
  const contractDoc = documents.find(doc => doc.documentType === 'contract');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <FileText className="w-8 h-8 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Согласование договора</h1>
      </div>

      {/* Project Info */}
      <ProjectInfo project={project} />

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Ошибка загрузки документов</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Qualification Objects CRUD - Этап согласования объемов */}
      <QualificationObjectsCRUD 
        contractorId={project.contractorId}
        contractorName={project.contractorName || 'Неизвестный контрагент'}
      />

      {/* Negotiation Stages */}
      <NegotiationStages 
        project={project}
        commercialOfferDoc={commercialOfferDoc}
        contractDoc={contractDoc}
      />

      {/* Document Uploads */}
      <div className="space-y-6">
        <DocumentUpload
          title="Коммерческое предложение"
          documentType="commercial_offer"
          document={commercialOfferDoc}
          uploading={uploading.commercial_offer || false}
          onUpload={(file) => handleFileUpload('commercial_offer', file)}
          onDownload={handleDownloadDocument}
          onView={handleViewDocument}
          onDelete={handleDeleteDocument}
          onApprove={handleApproveDocument}
          showApprovalButton={true}
          isApproved={commercialOfferDoc ? approvedDocuments.has(commercialOfferDoc.id) : false}
        />

        <DocumentUpload
          title="Договор"
          documentType="contract"
          document={contractDoc}
          uploading={uploading.contract || false}
          onUpload={(file) => handleFileUpload('contract', file)}
          onDownload={handleDownloadDocument}
          onView={handleViewDocument}
          onDelete={handleDeleteDocument}
          onApprove={handleApproveDocument}
          showApprovalButton={true}
          isApproved={contractDoc ? approvedDocuments.has(contractDoc.id) : false}
          disabled={!commercialOfferDoc || !approvedDocuments.has(commercialOfferDoc?.id || '')}
        />
      </div>

      {/* Status Summary */}
      <StatusSummary 
        documents={documents}
        commercialOfferDoc={commercialOfferDoc}
        contractDoc={contractDoc}
        approvedDocuments={approvedDocuments}
      />

      {/* Instructions */}
      <ContractInstructions />
    </div>
  );
};