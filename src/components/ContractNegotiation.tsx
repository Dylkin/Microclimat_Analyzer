import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Upload, Download, Eye, Trash2, CheckCircle, XCircle, Clock, AlertTriangle, Plus, Edit2, Building, Car, Refrigerator, Snowflake } from 'lucide-react';
import { Project } from '../types/Project';
import { QualificationObject, QualificationObjectTypeLabels, CreateQualificationObjectData } from '../types/QualificationObject';
import { projectDocumentService, ProjectDocument } from '../utils/projectDocumentService';
import { qualificationObjectService } from '../utils/qualificationObjectService';
import { QualificationObjectForm } from './QualificationObjectForm';
import { useAuth } from '../contexts/AuthContext';

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

  const getDocumentTypeLabel = (type: 'commercial_offer' | 'contract') => {
    return type === 'commercial_offer' ? 'Коммерческое предложение' : 'Договор';
  };

  const getDocumentByType = (type: 'commercial_offer' | 'contract') => {
    return documents.find(doc => doc.documentType === type);
  };

  // Get documents once to avoid repeated calls and undefined access
  const commercialOfferDoc = getDocumentByType('commercial_offer');
  const contractDoc = getDocumentByType('contract');

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (hasDocument: boolean) => {
    return hasDocument ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <Clock className="w-5 h-5 text-yellow-500" />
    );
  };

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
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Информация о проекте</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Название проекта</label>
            <p className="text-gray-900">{project.name || 'Не указано'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Контрагент</label>
            <p className="text-gray-900">{project.contractorName || 'Не указан'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Статус</label>
            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
              Согласование договора
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Дата создания</label>
            <p className="text-gray-900">
              {project.createdAt ? new Date(project.createdAt).toLocaleDateString('ru-RU') : 'Не указана'}
            </p>
          </div>
        </div>
        {project.description && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Описание</label>
            <p className="text-gray-900">{project.description}</p>
          </div>
        )}
      </div>

      {/* Этапы согласования */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Этапы согласования</h2>
        
        {/* Коммерческое предложение */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            {getStatusIcon(!!commercialOfferDoc)}
            <h3 className="text-lg font-semibold text-gray-900">Коммерческое предложение</h3>
          </div>
          
          <div className="space-y-4 ml-8">
            {/* Этап 1: Согласование объемов */}
            <div className="border-l-4 border-blue-500 pl-4 py-3 bg-blue-50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">1. Согласование объемов</h4>
                  <p className="text-sm text-gray-600">Ответственный: Менеджер</p>
                  <p className="text-sm text-gray-500">Срок: 1 день с даты создания проекта</p>
                  <p className="text-sm text-gray-500">
                    Плановая дата завершения: {
                      project.createdAt 
                        ? new Date(new Date(project.createdAt).getTime() + 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU')
                        : 'Не определена'
                    }
                  </p>
                </div>
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                  В работе
                </span>
              </div>
            </div>

            {/* Этап 2: Формирование стоимости */}
            <div className="border-l-4 border-gray-300 pl-4 py-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">2. Формирование стоимости</h4>
                  <p className="text-sm text-gray-600">Ответственный: Руководитель</p>
                  <p className="text-sm text-gray-500">Срок: 1 день с даты завершения предыдущего этапа</p>
                </div>
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                  Ожидает
                </span>
              </div>
            </div>

            {/* Этап 3: Рассмотрение заказчиком */}
            <div className="border-l-4 border-gray-300 pl-4 py-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">3. Рассмотрение заказчиком</h4>
                  <p className="text-sm text-gray-600">Ответственный: Менеджер</p>
                  <p className="text-sm text-gray-500">Срок: 2 дня с даты завершения предыдущего этапа</p>
                </div>
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                  Ожидает
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Договор */}
        <div>
          <div className="flex items-center space-x-3 mb-4">
            {getStatusIcon(!!contractDoc)}
            <h3 className="text-lg font-semibold text-gray-900">Договор</h3>
            {!commercialOfferDoc && (
              <span className="text-sm text-gray-500">(доступен после принятия коммерческого предложения)</span>
            )}
          </div>
          
          <div className={`space-y-4 ml-8 ${!commercialOfferDoc ? 'opacity-50' : ''}`}>
            {/* Этап 4: Подготовка договора */}
            <div className={`border-l-4 pl-4 py-3 ${commercialOfferDoc ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">4. Подготовка договора</h4>
                  <p className="text-sm text-gray-600">Ответственный: Руководитель</p>
                  <p className="text-sm text-gray-500">Срок: 1 день с даты завершения предыдущего этапа</p>
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  commercialOfferDoc 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {commercialOfferDoc ? 'В работе' : 'Ожидает'}
                </span>
              </div>
            </div>

            {/* Этап 5: Согласование заказчиком */}
            <div className="border-l-4 border-gray-300 pl-4 py-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">5. Согласование заказчиком</h4>
                  <p className="text-sm text-gray-600">Ответственный: Менеджер</p>
                  <p className="text-sm text-gray-500">Срок: 3 дня с даты завершения предыдущего этапа</p>
                </div>
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                  Ожидает
                </span>
              </div>
            </div>

            {/* Переход к исполнению */}
            {contractDoc && (
              <div className="border-l-4 border-green-500 pl-4 py-3 bg-green-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">✅ Готов к исполнению работ</h4>
                    <p className="text-sm text-gray-600">Все документы согласованы</p>
                  </div>
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Завершено
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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

      {/* Documents Section */}
      <div className="space-y-6">
        {/* Commercial Offer */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {getStatusIcon(!!commercialOfferDoc)}
              <h3 className="text-lg font-semibold text-gray-900">Коммерческое предложение</h3>
            </div>
            {!commercialOfferDoc && (
              <label className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer flex items-center space-x-2">
                {uploading.commercial_offer ? (
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
                      handleFileUpload('commercial_offer', file);
                    }
                  }}
                  className="hidden"
                  disabled={uploading.commercial_offer}
                />
              </label>
            )}
          </div>

          {commercialOfferDoc ? (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="w-8 h-8 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {commercialOfferDoc.fileName}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(commercialOfferDoc.fileSize)} • 
                      Загружен {commercialOfferDoc.uploadedAt.toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleViewDocument(commercialOfferDoc)}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                    title="Просмотреть документ"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDownloadDocument(commercialOfferDoc)}
                    className="text-green-600 hover:text-green-800 transition-colors"
                    title="Скачать документ"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteDocument(commercialOfferDoc.id, 'commercial_offer')}
                    className="text-red-600 hover:text-red-800 transition-colors"
                    title="Удалить документ"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">Коммерческое предложение не загружено</p>
              <p className="text-sm text-gray-400">Поддерживаются файлы PDF, DOC, DOCX</p>
            </div>
          )}
        </div>

        {/* Contract */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {getStatusIcon(!!contractDoc)}
              <h3 className="text-lg font-semibold text-gray-900">Договор</h3>
            </div>
            {!contractDoc && (
              <label className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer flex items-center space-x-2">
                {uploading.contract ? (
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
                      handleFileUpload('contract', file);
                    }
                  }}
                  className="hidden"
                  disabled={uploading.contract}
                />
              </label>
            )}
          </div>

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
                    onClick={() => handleViewDocument(contractDoc)}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                    title="Просмотреть документ"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDownloadDocument(contractDoc)}
                    className="text-green-600 hover:text-green-800 transition-colors"
                    title="Скачать документ"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteDocument(contractDoc.id, 'contract')}
                    className="text-red-600 hover:text-red-800 transition-colors"
                    title="Удалить документ"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">Договор не загружен</p>
              <p className="text-sm text-gray-400">Поддерживаются файлы PDF, DOC, DOCX</p>
            </div>
          )}
        </div>
      </div>

      {/* Status Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Статус согласования</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              {getStatusIcon(!!commercialOfferDoc)}
              <span className="font-medium text-gray-900">Коммерческое предложение</span>
            </div>
            <span className={`text-sm px-2 py-1 rounded-full ${
              commercialOfferDoc 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {commercialOfferDoc ? 'Загружено' : 'Ожидает загрузки'}
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              {getStatusIcon(!!contractDoc)}
              <span className="font-medium text-gray-900">Договор</span>
            </div>
            <span className={`text-sm px-2 py-1 rounded-full ${
              contractDoc 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {contractDoc ? 'Загружено' : 'Ожидает загрузки'}
            </span>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Прогресс согласования</span>
            <span className="text-sm text-gray-500">
              {documents.length} из 2 документов
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(documents.length / 2) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Next steps */}
        {documents.length === 2 && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">
                Все документы загружены! Проект готов к переходу на следующий этап.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Инструкции по работе:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Загрузите коммерческое предложение в формате PDF, DOC или DOCX</li>
          <li>• После согласования загрузите подписанный договор</li>
          <li>• Используйте кнопки "Просмотр" для проверки документов</li>
          <li>• После загрузки всех документов проект можно перевести на следующий этап</li>
          <li>• Документы можно заменить, загрузив новые версии</li>
        </ul>
      </div>
    </div>
  );
};