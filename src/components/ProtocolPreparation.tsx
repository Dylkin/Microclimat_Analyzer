import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, AlertTriangle, Upload, Download, Eye, Trash2, CheckCircle } from 'lucide-react';
import { Project } from '../types/Project';
import { projectDocumentService, ProjectDocument } from '../utils/projectDocumentService';
import { useAuth } from '../contexts/AuthContext';
import { ProjectInfo } from './contract/ProjectInfo';
import { QualificationObjectsDisplay } from './contract/QualificationObjectsDisplay';

interface ProtocolPreparationProps {
  project: Project;
  onBack: () => void;
}

export const ProtocolPreparation: React.FC<ProtocolPreparationProps> = ({ project, onBack }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [protocolDocuments, setProtocolDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      
      // Фильтруем протоколы (пока используем тип layout_scheme для протоколов)
      const protocols = docs.filter(doc => doc.documentType === 'layout_scheme');
      setProtocolDocuments(protocols);
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

  // Загрузка протокола
  const handleProtocolUpload = async (file: File) => {
    if (!file) return;

    // Проверяем тип файла
    if (!file.name.toLowerCase().endsWith('.docx')) {
      alert('Поддерживаются только файлы DOCX');
      return;
    }

    setUploading(true);

    try {
      const uploadedDoc = await projectDocumentService.uploadDocument(
        project.id, 
        'layout_scheme', // Используем layout_scheme для протоколов
        file, 
        user?.id
      );
      
      // Обновляем список протоколов
      setProtocolDocuments(prev => [...prev, uploadedDoc]);
      alert('Протокол успешно загружен');
    } catch (error) {
      console.error('Ошибка загрузки протокола:', error);
      alert(`Ошибка загрузки протокола: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setUploading(false);
    }
  };

  // Удаление протокола
  const handleDeleteProtocol = async (documentId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот протокол?')) {
      return;
    }

    try {
      await projectDocumentService.deleteDocument(documentId);
      setProtocolDocuments(prev => prev.filter(doc => doc.id !== documentId));
      alert('Протокол успешно удален');
    } catch (error) {
      console.error('Ошибка удаления протокола:', error);
      alert(`Ошибка удаления протокола: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  // Скачивание протокола
  const handleDownloadProtocol = async (document: ProjectDocument) => {
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
      console.error('Ошибка скачивания протокола:', error);
      alert(`Ошибка скачивания протокола: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  // Просмотр протокола
  const handleViewProtocol = (document: ProjectDocument) => {
    window.open(document.fileUrl, '_blank');
  };

  // Форматирование размера файла
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Получение договора из документов
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
        <h1 className="text-2xl font-bold text-gray-900">Подготовка протокола</h1>
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

      {/* Contract Link */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Договор</h3>
        
        {contractDoc ? (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="w-8 h-8 text-green-600" />
                <div>
                  <h4 className="font-medium text-gray-900">
                    {contractDoc.fileName}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(contractDoc.fileSize)} • 
                    Загружен {contractDoc.uploadedAt.toLocaleDateString('ru-RU')}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleViewProtocol(contractDoc)}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                  title="Просмотреть договор"
                >
                  <Eye className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDownloadProtocol(contractDoc)}
                  className="text-green-600 hover:text-green-800 transition-colors"
                  title="Скачать договор"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">Договор не найден</p>
            <p className="text-sm text-gray-400">
              Договор должен быть загружен на этапе согласования
            </p>
          </div>
        )}
      </div>

      {/* Qualification Objects */}
      <QualificationObjectsDisplay 
        contractorId={project.contractorId}
        contractorName={project.contractorName || 'Неизвестный контрагент'}
        selectedObjectIds={project.qualificationObjects.map(obj => obj.qualificationObjectId)}
      />

      {/* Protocol Upload */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Протокол</h3>
          {protocolDocuments.length === 0 && (
            <label className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer flex items-center space-x-2">
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Загрузка...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Загрузить протокол</span>
                </>
              )}
              <input
                type="file"
                accept=".docx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleProtocolUpload(file);
                  }
                }}
                className="hidden"
                disabled={uploading}
              />
            </label>
          )}
        </div>

        {protocolDocuments.length > 0 ? (
          <div className="space-y-4">
            {protocolDocuments.map((protocol) => (
              <div key={protocol.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-8 h-8 text-blue-600" />
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {protocol.fileName}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(protocol.fileSize)} • 
                        Загружен {protocol.uploadedAt.toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewProtocol(protocol)}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="Просмотреть протокол"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDownloadProtocol(protocol)}
                      className="text-green-600 hover:text-green-800 transition-colors"
                      title="Скачать протокол"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteProtocol(protocol.id)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                      title="Удалить протокол"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Кнопка для загрузки дополнительного протокола */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <label className="cursor-pointer flex flex-col items-center space-y-2">
                <Upload className="w-8 h-8 text-gray-400" />
                <span className="text-sm text-gray-600">
                  Загрузить дополнительный протокол
                </span>
                <span className="text-xs text-gray-500">
                  Поддерживаются файлы DOCX
                </span>
                <input
                  type="file"
                  accept=".docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleProtocolUpload(file);
                    }
                  }}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">Протокол не загружен</p>
            <p className="text-sm text-gray-400">Поддерживаются файлы DOCX</p>
          </div>
        )}
      </div>

      {/* Status Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Статус подготовки протокола</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              {contractDoc ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              )}
              <span className="font-medium text-gray-900">Договор</span>
            </div>
            <span className={`text-sm px-2 py-1 rounded-full ${
              contractDoc 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {contractDoc ? 'Доступен' : 'Не найден'}
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              {protocolDocuments.length > 0 ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              )}
              <span className="font-medium text-gray-900">Протокол</span>
            </div>
            <span className={`text-sm px-2 py-1 rounded-full ${
              protocolDocuments.length > 0 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {protocolDocuments.length > 0 ? `Загружено (${protocolDocuments.length})` : 'Ожидает загрузки'}
            </span>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Прогресс подготовки</span>
            <span className="text-sm text-gray-500">
              {(contractDoc ? 1 : 0) + (protocolDocuments.length > 0 ? 1 : 0)} из 2 этапов
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${((contractDoc ? 1 : 0) + (protocolDocuments.length > 0 ? 1 : 0)) / 2 * 100}%` 
              }}
            ></div>
          </div>
        </div>

        {/* Completion status */}
        {contractDoc && protocolDocuments.length > 0 && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">
                Протокол подготовлен! Проект готов к переходу на этап проведения испытаний.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Инструкции по подготовке протокола:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Проверьте договор:</strong> Убедитесь, что договор загружен и доступен</li>
          <li>• <strong>Просмотрите объекты квалификации:</strong> Проверьте корректность данных</li>
          <li>• <strong>Загрузите протокол:</strong> Подготовьте и загрузите протокол в формате DOCX</li>
          <li>• <strong>Проверьте документы:</strong> Используйте кнопки просмотра для проверки</li>
          <li>• <strong>Замена протокола:</strong> При необходимости можно загрузить новую версию</li>
          <li>• <strong>Переход к испытаниям:</strong> После загрузки протокола проект готов к испытаниям</li>
        </ul>
      </div>
    </div>
  );
};