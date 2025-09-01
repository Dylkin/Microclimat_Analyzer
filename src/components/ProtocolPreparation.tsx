import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, AlertTriangle, Building, Car, Refrigerator, Snowflake, Plus, Trash2, Edit2, Save, Download, Upload, Eye, X } from 'lucide-react';
import { Project } from '../types/Project';
import { QualificationObject, QualificationObjectTypeLabels } from '../types/QualificationObject';
import { Equipment } from '../types/Equipment';
import { qualificationObjectService } from '../utils/qualificationObjectService';
import { equipmentService } from '../utils/equipmentService';
import { equipmentAssignmentService, EquipmentPlacement } from '../utils/equipmentAssignmentService';
import { projectDocumentService, ProjectDocument } from '../utils/projectDocumentService';
import { useAuth } from '../contexts/AuthContext';

interface ProtocolPreparationProps {
  project: Project;
  onBack: () => void;
}

export const ProtocolPreparation: React.FC<ProtocolPreparationProps> = ({ project, onBack }) => {
  const { user } = useAuth();
  const [qualificationObjects, setQualificationObjects] = useState<QualificationObject[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Equipment placement state
  const [equipmentPlacements, setEquipmentPlacements] = useState<Map<string, EquipmentPlacement>>(new Map());
  const [editingPlacement, setEditingPlacement] = useState<string | null>(null);

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

  // Загрузка данных
  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Загружаем объекты квалификации проекта
      if (qualificationObjectService.isAvailable()) {
        const allObjects = await qualificationObjectService.getQualificationObjectsByContractor(project.contractorId);
        const projectObjectIds = project.qualificationObjects.map(obj => obj.qualificationObjectId);
        const projectObjects = allObjects.filter(obj => projectObjectIds.includes(obj.id));
        setQualificationObjects(projectObjects);
        
        // Загружаем размещение оборудования для каждого объекта
        const placements = new Map<string, EquipmentPlacement>();
        for (const obj of projectObjects) {
          try {
            const placement = await equipmentAssignmentService.getEquipmentPlacement(project.id, obj.id);
            placements.set(obj.id, placement);
          } catch (error) {
            console.warn(`Не удалось загрузить размещение для объекта ${obj.id}:`, error);
            // Создаем пустое размещение
            placements.set(obj.id, { zones: [] });
          }
        }
        setEquipmentPlacements(placements);
      }

      // Загружаем доступное оборудование
      if (equipmentService.isAvailable()) {
        const equipmentResult = await equipmentService.getAllEquipment(1, 1000); // Загружаем все оборудование
        setEquipment(equipmentResult.equipment);
      }

      // Загружаем документы проекта
      if (projectDocumentService.isAvailable()) {
        const docs = await projectDocumentService.getProjectDocuments(project.id);
        setDocuments(docs);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [project.id]);

  // Получение иконки для типа объекта
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'помещение':
        return <Building className="w-5 h-5 text-blue-600" />;
      case 'автомобиль':
        return <Car className="w-5 h-5 text-green-600" />;
      case 'холодильная_камера':
        return <Refrigerator className="w-5 h-5 text-cyan-600" />;
      case 'холодильник':
        return <Refrigerator className="w-5 h-5 text-blue-500" />;
      case 'морозильник':
        return <Snowflake className="w-5 h-5 text-indigo-600" />;
      default:
        return <Building className="w-5 h-5 text-gray-600" />;
    }
  };

  // Загрузка документа
  const handleFileUpload = async (documentType: 'layout_scheme', file: File, qualificationObjectId?: string) => {
    if (!file) return;

    // Проверяем тип файла - разрешаем изображения, PDF и документы
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      alert('Поддерживаются только файлы: JPG, PNG, GIF, BMP, TIFF, PDF, DOC, DOCX');
      return;
    }

    setOperationLoading(true);
    try {
      const uploadedDoc = await projectDocumentService.uploadDocument(project.id, documentType, file, user?.id, qualificationObjectId);
      
      // Обновляем список документов
      setDocuments(prev => {
        const filtered = prev.filter(doc => 
          !(doc.documentType === documentType && 
            ((qualificationObjectId && doc.qualificationObjectId === qualificationObjectId) ||
             (!qualificationObjectId && !doc.qualificationObjectId)))
        );
        return [...filtered, uploadedDoc];
      });
      
      alert('Документ успешно загружен');
    } catch (error) {
      console.error('Ошибка загрузки документа:', error);
      alert(`Ошибка загрузки документа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Удаление документа
  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот документ?')) {
      return;
    }

    setOperationLoading(true);
    try {
      await projectDocumentService.deleteDocument(documentId);
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      alert('Документ успешно удален');
    } catch (error) {
      console.error('Ошибка удаления документа:', error);
      alert(`Ошибка удаления документа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
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
        <h1 className="text-2xl font-bold text-gray-900">Подготовка протокола</h1>
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
            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
              Подготовка протокола
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Объектов квалификации</label>
            <p className="text-gray-900">{project.qualificationObjects.length}</p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Ошибка загрузки данных</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка данных протокола...</p>
        </div>
      )}

      {/* Qualification Objects and Layout Schemes */}
      {!loading && qualificationObjects.length > 0 && (
        <div className="space-y-6">
          {qualificationObjects.map((obj) => {
            return (
              <div key={obj.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    {getTypeIcon(obj.type)}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {obj.name || obj.vin || obj.serialNumber || 'Без названия'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {QualificationObjectTypeLabels[obj.type]}
                        {obj.address && ` • ${obj.address}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Layout Scheme Upload */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Схема размещения</h4>
                  
                  {(() => {
                    const layoutDocs = documents.filter(doc => 
                      doc.documentType === 'layout_scheme' && 
                      doc.qualificationObjectId === obj.id
                    );
                    
                    return (
                      <div className="space-y-4">
                        {/* Отображение загруженных документов */}
                        {layoutDocs.length > 0 && (
                          <div className="space-y-2">
                            {layoutDocs.map(doc => (
                              <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <FileText className="w-5 h-5 text-blue-600" />
                                  <div>
                                    <p className="font-medium text-gray-900">{doc.fileName}</p>
                                    <p className="text-sm text-gray-500">
                                      Загружен {doc.uploadedAt.toLocaleDateString('ru-RU')}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => window.open(doc.fileUrl, '_blank')}
                                    className="text-blue-600 hover:text-blue-800 transition-colors"
                                    title="Просмотреть"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = doc.fileUrl;
                                      link.download = doc.fileName;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                    }}
                                    className="text-green-600 hover:text-green-800 transition-colors"
                                    title="Скачать"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDocument(doc.id)}
                                    className="text-red-600 hover:text-red-800 transition-colors"
                                    title="Удалить"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Область загрузки новых файлов */}
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600 mb-3">
                            {layoutDocs.length > 0 ? 'Заменить схему размещения' : 'Загрузите схему размещения оборудования'}
                          </p>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.bmp,.tiff"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFileUpload('layout_scheme', file, obj.id);
                              }
                            }}
                            className="hidden"
                            id={`layout-upload-${obj.id}`}
                          />
                          <label
                            htmlFor={`layout-upload-${obj.id}`}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {layoutDocs.length > 0 ? 'Заменить файл' : 'Выбрать файл'}
                          </label>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Инструкции по подготовке протокола:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Проверьте схемы размещения:</strong> Убедитесь, что для каждого объекта квалификации загружена схема размещения оборудования</li>
          <li>• <strong>Подготовьте протокол:</strong> Создайте протокол испытаний в формате DOCX на основе схем размещения</li>
          <li>• <strong>Загрузите протокол:</strong> Прикрепите готовый протокол к проекту</li>
          <li>• <strong>Проверьте документы:</strong> Убедитесь, что все необходимые документы загружены и доступны</li>
        </ul>
      </div>
    </div>
  );
};