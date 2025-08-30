import React from 'react';
import { Upload, Download, Eye, Trash2, FileText } from 'lucide-react';
import { ProjectDocument } from '../../utils/projectDocumentService';

interface DocumentUploadProps {
  title: string;
  documentType: 'commercial_offer' | 'contract';
  document?: ProjectDocument;
  uploading: boolean;
  onUpload: (file: File) => void;
  onDownload: (document: ProjectDocument) => void;
  onView: (document: ProjectDocument) => void;
  onDelete: (documentId: string, documentType: string) => void;
  disabled?: boolean;
  onApprove?: (document: ProjectDocument) => void;
  showApprovalButton?: boolean;
  isApproved?: boolean;
  userRole?: string;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  title,
  documentType,
  document,
  uploading,
  onUpload,
  onDownload,
  onView,
  onDelete,
  disabled = false,
  onApprove,
  showApprovalButton = false,
  isApproved = false
  userRole
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {!document && !disabled && (
          <label className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer flex items-center space-x-2">
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Загрузка...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Загрузить</span>
              </>
            )}
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onUpload(file);
                }
              }}
              className="hidden"
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {document ? (
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className={`w-8 h-8 ${documentType === 'contract' ? 'text-green-600' : 'text-blue-600'}`} />
              <div>
                <h4 className="font-medium text-gray-900">
                  {document.fileName}
                </h4>
                <p className="text-sm text-gray-500">
                  {formatFileSize(document.fileSize)} • 
                  Загружен {document.uploadedAt.toLocaleDateString('ru-RU')}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onView(document)}
                className="text-blue-600 hover:text-blue-800 transition-colors"
                title="Просмотреть документ"
              >
                <Eye className="w-5 h-5" />
              </button>
              <button
                onClick={() => onDownload(document)}
                className="text-green-600 hover:text-green-800 transition-colors"
                title="Скачать документ"
              >
                <Download className="w-5 h-5" />
              </button>
              {showApprovalButton && onApprove && !isApproved && (
                <button
                  onClick={() => onApprove(document)}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                  title="Согласовать документ"
                >
                  Согласовано
                </button>
              )}
              {isApproved && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  ✓ Согласовано
                </span>
              )}
              {(!isApproved || userRole === 'administrator') && (
                <button
                  onClick={() => onDelete(document.id, documentType)}
                  className="text-red-600 hover:text-red-800 transition-colors"
                  title="Удалить документ"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">{title} не загружено</p>
          <p className="text-sm text-gray-400">Поддерживаются файлы PDF, DOC, DOCX</p>
        </div>
      )}
    </div>
  );
};