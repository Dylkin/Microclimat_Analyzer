import React from 'react';
import { Upload, Download, Trash2, CheckCircle, X } from 'lucide-react';
import { ProjectDocument } from '../../utils/projectDocumentService';

interface DocumentUploadProps {
  title: string;
  document?: ProjectDocument;
  onUpload: (file: File) => void;
  onDelete: (documentId: string) => void;
  onApprove?: (documentId: string) => void;
  onUnapprove?: (documentId: string) => void;
  showApprovalButton?: boolean;
  approvalInfo?: {
    isApproved: boolean;
    approvedAt?: Date;
    approvedBy?: string;
    approvedByRole?: string;
  };
  userRole?: string;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  title,
  document,
  onUpload,
  onDelete,
  onApprove,
  onUnapprove,
  showApprovalButton = false,
  approvalInfo,
  userRole
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUpload(file);
    }
    // Reset input value to allow uploading the same file again
    event.target.value = '';
  };

  const handleDownload = () => {
    if (document?.fileUrl) {
      window.open(document.fileUrl, '_blank');
    }
  };

  const handleDelete = () => {
    if (document) {
      onDelete(document.id);
    }
  };

  const handleApprove = () => {
    if (document && onApprove) {
      onApprove(document.id);
    }
  };

  const handleUnapprove = () => {
    if (document && onUnapprove) {
      onUnapprove(document.id);
    }
  };

  const canDelete = () => {
    if (!document) return false;
    // Администраторы могут удалять любые документы
    if (userRole === 'admin' || userRole === 'administrator') return true;
    // Остальные роли не могут удалять согласованные документы
    return !approvalInfo?.isApproved;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {approvalInfo?.isApproved && (
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Согласовано</span>
          </div>
        )}
      </div>

      {document ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{document.fileName}</p>
                <p className="text-sm text-gray-500">
                  {formatFileSize(document.fileSize)} • Загружен {document.uploadedAt.toLocaleDateString('ru-RU')}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownload}
                className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Скачать"
              >
                <Download className="w-4 h-4" />
              </button>
              {canDelete() && (
                <button
                  onClick={handleDelete}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Удалить"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Информация о согласовании */}
          {approvalInfo?.isApproved && approvalInfo.approvedAt && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="text-sm text-green-800">
                <div className="font-medium">Согласовано:</div>
                <div className="text-xs mt-1">
                  {approvalInfo.approvedAt.toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })} • {approvalInfo.approvedBy} • {approvalInfo.approvedByRole}
                </div>
              </div>
            </div>
          )}

          {showApprovalButton && (
            <button
              onClick={approvalInfo?.isApproved ? handleUnapprove : handleApprove}
              className={`w-full py-2 px-4 rounded-lg transition-colors font-medium flex items-center justify-center space-x-2 ${
                approvalInfo?.isApproved
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {approvalInfo?.isApproved ? (
                <>
                  <X className="w-4 h-4" />
                  <span>Отменить согласование</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>{title.includes('Договор') ? 'Согласовать' : 'Согласовать'}</span>
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Перетащите файл сюда или нажмите для выбора</p>
          <input
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            id={`file-upload-${title.replace(/\s+/g, '-').toLowerCase()}`}
            accept=".pdf,.doc,.docx"
          />
          <label
            htmlFor={`file-upload-${title.replace(/\s+/g, '-').toLowerCase()}`}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 mr-2" />
            Выбрать файл
          </label>
        </div>
      )}
    </div>
  );
};