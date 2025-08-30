import React from 'react';
import { Upload, Download, Trash2, CheckCircle, Clock } from 'lucide-react';
import { ProjectDocument } from '../../utils/projectDocumentService';

interface DocumentUploadProps {
  title: string;
  document?: ProjectDocument;
  onUpload: (file: File) => void;
  onDelete: (documentId: string) => void;
  onApprove?: (documentId: string) => void;
  showApprovalButton?: boolean;
  isApproved?: boolean;
  userRole?: string;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  title,
  document,
  onUpload,
  onDelete,
  onApprove,
  showApprovalButton = false,
  isApproved = false,
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
    if (document?.file_url) {
      window.open(document.file_url, '_blank');
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

  const canDelete = () => {
    if (!document) return false;
    // Администраторы могут удалять любые документы
    if (userRole === 'administrator') return true;
    // Остальные роли не могут удалять согласованные документы
    return !isApproved;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {isApproved && (
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
                <p className="font-medium text-gray-900">{document.file_name}</p>
                <p className="text-sm text-gray-500">
                  {formatFileSize(document.file_size)} • Загружен {new Date(document.uploaded_at).toLocaleDateString('ru-RU')}
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

          {showApprovalButton && !isApproved && (
            <button
              onClick={handleApprove}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              {title.includes('Договор') ? 'Согласован' : 'Согласовано'}
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