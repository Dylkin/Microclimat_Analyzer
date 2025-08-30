import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, AlertTriangle, Upload, Download, Eye, Trash2, CheckCircle, Edit2, X } from 'lucide-react';
import { Project } from '../types/Project';
import { QualificationObject } from '../types/QualificationObject';
import { projectDocumentService, ProjectDocument } from '../utils/projectDocumentService';
import { qualificationObjectService } from '../utils/qualificationObjectService';
import { useAuth } from '../contexts/AuthContext';
import { ProjectInfo } from './contract/ProjectInfo';
import { QualificationObjectForm } from './QualificationObjectForm';

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
  const [qualificationObjects, setQualificationObjects] = useState<QualificationObject[]>([]);
  const [editingObject, setEditingObject] = useState<QualificationObject | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);

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
      
      // Загружаем выбранные объекты квалификации
      await loadSelectedQualificationObjects();
    } catch (error) {
      console.error('Ошибка загрузки документов:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка выбранных объектов квалификации
  const loadSelectedQualificationObjects = async () => {
    if (!qualificationObjectService.isAvailable()) {
      setError('Supabase не настроен для работы с объектами квалификации');
      return;
    }

    try {
      // Получаем ID выбранных объектов из проекта
      const selectedObjectIds = project.qualificationObjects.map(obj => obj.qualificationObjectId);
      
      if (selectedObjectIds.length === 0) {
        setQualificationObjects([]);
        return;
      }

      // Загружаем все объекты контрагента
      const allObjects = await qualificationObjectService.getQualificationObjectsByContractor(project.contractorId);
      
      // Фильтруем только выбранные объекты
      const selectedObjects = allObjects.filter(obj => selectedObjectIds.includes(obj.id));
      
      setQualificationObjects(selectedObjects);
      console.log('Загружены выбранные объекты квалификации для протокола:', selectedObjects.length);
    } catch (error) {
      console.error('Ошибка загрузки объектов квалификации:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
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

  // Обновление объекта квалификации
  const handleUpdateQualificationObject = async (updatedObject: QualificationObject) => {
    setOperationLoading(true);
    try {
      const updated = await qualificationObjectService.updateQualificationObject(
        updatedObject.id,
        updatedObject
      );
      
      setQualificationObjects(prev => prev.map(obj => 
        obj.id === updatedObject.id ? updated : obj
      ));
      
      setEditingObject(null);
      alert('Объект квалификации успешно обновлен');
    } catch (error) {
      console.error('Ошибка обновления объекта квалификации:', error);
      alert(`Ошибка обновления объекта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Получение иконки для типа объекта
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'помещение':
        return '🏢';
      case 'автомобиль':
        return '🚗';
      case 'холодильная_камера':
        return '🧊';
      case 'холодильник':
        return '❄️';
      case 'морозильник':
        return '🥶';
      default:
        return '🏢';
    }
  };

  // Рендер деталей объекта
  const renderObjectDetails = (obj: QualificationObject) => {
    const details = [];

    if (obj.address) details.push(`📍 ${obj.address}`);
    if (obj.area) details.push(`📐 ${obj.area} м²`);
    if (obj.vin) details.push(`🔢 VIN: ${obj.vin}`);
    if (obj.registrationNumber) details.push(`🚗 ${obj.registrationNumber}`);
    if (obj.bodyVolume) details.push(`📦 ${obj.bodyVolume} м³`);
    if (obj.inventoryNumber) details.push(`📋 Инв. №: ${obj.inventoryNumber}`);
    if (obj.chamberVolume) details.push(`📦 ${obj.chamberVolume} л`);
    if (obj.serialNumber) details.push(`🔢 S/N: ${obj.serialNumber}`);
    if (obj.manufacturer) details.push(`🏭 ${obj.manufacturer}`);
    if (obj.climateSystem) details.push(`❄️ ${obj.climateSystem}`);

    return details;
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
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Объекты квалификации</h2>
            <p className="text-sm text-gray-600 mt-1">
              Контрагент: <span className="font-medium">{project.contractorName || 'Неизвестный контрагент'}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Отображаются только объекты, выбранные на этапе согласования договора
            </p>
          </div>
        </div>

        {/* Edit Form */}
        {editingObject && (
          <div className="mb-6 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Редактировать объект квалификации</h3>
              <button
                onClick={() => setEditingObject(null)}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <QualificationObjectForm
              contractorId={project.contractorId}
              contractorAddress={editingObject.address}
              initialData={editingObject}
              onSubmit={handleUpdateQualificationObject}
              onCancel={() => setEditingObject(null)}
              hideTypeSelection={true}
            />
          </div>
        )}

        {/* Objects List */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Загрузка объектов квалификации...</p>
          </div>
        ) : qualificationObjects.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-gray-600">Объекты квалификации не выбраны</p>
            <p className="text-sm text-gray-500 mt-1">
              Вернитесь на этап согласования договора для выбора объектов
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              Выбрано объектов: <span className="font-medium">{qualificationObjects.length}</span>
            </div>
            
            {qualificationObjects.map((object) => (
              <div key={object.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl mt-1">
                      {getTypeIcon(object.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium text-gray-900">
                          {object.name || object.vin || object.serialNumber || 'Без названия'}
                        </h3>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {object.type}
                        </span>
                      </div>
                      
                      {/* Детали объекта */}
                      <div className="space-y-1">
                        {renderObjectDetails(object).map((detail, index) => (
                          <div key={index} className="text-sm text-gray-600">
                            {detail}
                          </div>
                        ))}
                      </div>

                      {/* Файлы объекта */}
                      {(object.planFileUrl || object.testDataFileUrl) && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="text-xs text-gray-500 mb-2">Прикрепленные файлы:</div>
                          <div className="flex items-center space-x-3">
                            {object.planFileUrl && (
                              <a
                                href={object.planFileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-xs flex items-center space-x-1"
                              >
                                <span>📋 План объекта</span>
                              </a>
                            )}
                            {object.testDataFileUrl && (
                              <a
                                href={object.testDataFileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-600 hover:text-green-800 text-xs flex items-center space-x-1"
                              >
                                <span>📊 Данные испытаний</span>
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingObject(object)}
                      disabled={operationLoading}
                      className="text-indigo-600 hover:text-indigo-900 transition-colors"
                      title="Редактировать"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {!loading && qualificationObjects.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Сводка по выбранным объектам:</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              {['помещение', 'автомобиль', 'холодильная_камера', 'холодильник', 'морозильник'].map((type) => {
                const count = qualificationObjects.filter(obj => obj.type === type).length;
                return count > 0 ? (
                  <div key={type} className="flex items-center space-x-2">
                    <span className="text-lg">{getTypeIcon(type)}</span>
                    <span className="text-blue-800">{type}: {count}</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        )}
      </div>

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
          <li>• <strong>Отредактируйте объекты квалификации:</strong> Проверьте и при необходимости обновите данные выбранных объектов</li>
          <li>• <strong>Загрузите протокол:</strong> Подготовьте и загрузите протокол в формате DOCX</li>
          <li>• <strong>Проверьте документы:</strong> Используйте кнопки просмотра для проверки</li>
          <li>• <strong>Замена протокола:</strong> При необходимости можно загрузить новую версию</li>
          <li>• <strong>Переход к испытаниям:</strong> После загрузки протокола проект готов к испытаниям</li>
        </ul>
      </div>
    </div>
  );
};