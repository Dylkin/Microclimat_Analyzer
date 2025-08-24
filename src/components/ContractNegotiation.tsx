import React, { useState, useEffect } from 'react';
import { ArrowLeft, Building2, Calendar, Save, Edit2, X, CheckCircle, AlertCircle, Upload, FileText, Download, Trash2 } from 'lucide-react';
import { Project } from '../types/Project';
import { Contractor } from '../types/Contractor';
import { QualificationObject, QualificationObjectTypeLabels, UpdateQualificationObjectData } from '../types/QualificationObject';
import { ProjectDocument, DocumentType, DocumentTypeLabels } from '../types/ProjectDocument';
import { DocumentStatus, DocumentStatusLabels, DocumentStatusColors } from '../types/ProjectDocument';
import { contractorService } from '../utils/contractorService';
import { qualificationObjectService } from '../utils/qualificationObjectService';
import { projectService } from '../utils/projectService';
import { projectDocumentService } from '../utils/projectDocumentService';
import { useAuth } from '../contexts/AuthContext';

interface ContractNegotiationProps {
  project: Project;
  onBack: () => void;
}

export const ContractNegotiation: React.FC<ContractNegotiationProps> = ({ project, onBack }) => {
  const { user } = useAuth();
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [qualificationObjects, setQualificationObjects] = useState<QualificationObject[]>([]);
  const [projectDocuments, setProjectDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingObject, setEditingObject] = useState<string | null>(null);
  const [editObjectData, setEditObjectData] = useState<UpdateQualificationObjectData>({});
  const [operationLoading, setOperationLoading] = useState(false);
  const [editingContractInfo, setEditingContractInfo] = useState(false);
  const [contractInfo, setContractInfo] = useState({
    contractNumber: project.contractNumber || '',
    estimatedCompletionDate: (() => {
      const date = new Date(project.createdAt);
      date.setDate(date.getDate() + 7);
      return date.toISOString().split('T')[0];
    })()
  });
  const [uploadingDocument, setUploadingDocument] = useState<DocumentType | null>(null);
  const [commercialOfferStatus, setCommercialOfferStatus] = useState<DocumentStatus>('draft');
  const [contractStatus, setContractStatus] = useState<DocumentStatus>('draft');

  // Вычисляем примерную дату завершения (дата создания + 7 дней)

  // Загрузка данных
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Загружаем данные контрагента
        if (contractorService.isAvailable()) {
          const contractorsData = await contractorService.getAllContractors();
          const projectContractor = contractorsData.find(c => c.id === project.contractorId);
          setContractor(projectContractor || null);
        }

        // Загружаем объекты квалификации проекта
        if (qualificationObjectService.isAvailable()) {
          const allObjects = await qualificationObjectService.getAllQualificationObjects();
          const projectObjectIds = project.qualificationObjects.map(obj => obj.qualificationObjectId);
          const projectObjects = allObjects.filter(obj => projectObjectIds.includes(obj.id));
          setQualificationObjects(projectObjects);
        }
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
      } finally {
        setLoading(false);
      }

      // Загружаем документы проекта
      if (projectDocumentService.isAvailable()) {
        const documentsData = await projectDocumentService.getProjectDocuments(project.id);
        setProjectDocuments(documentsData);
        
        // Устанавливаем статусы документов на основе их наличия
        const hasCommercialOffer = documentsData.some(doc => doc.documentType === 'commercial_offer');
        const hasContract = documentsData.some(doc => doc.documentType === 'contract');
        
        if (hasCommercialOffer) {
          setCommercialOfferStatus('ready_to_send');
        }
        if (hasContract) {
          setContractStatus('ready_to_send');
        }
      }
    };

    loadData();
  }, [project]);

  // Начало редактирования объекта квалификации
  const handleEditObject = (obj: QualificationObject) => {
    setEditObjectData({
      name: obj.name,
      address: obj.address,
      area: obj.area,
      climateSystem: obj.climateSystem,
      vin: obj.vin,
      registrationNumber: obj.registrationNumber,
      bodyVolume: obj.bodyVolume,
      inventoryNumber: obj.inventoryNumber,
      chamberVolume: obj.chamberVolume,
      serialNumber: obj.serialNumber
    });
    setEditingObject(obj.id);
  };

  // Сохранение изменений объекта квалификации
  const handleSaveObject = async () => {
    if (!editingObject) return;

    setOperationLoading(true);
    try {
      const updatedObject = await qualificationObjectService.updateQualificationObject(
        editingObject,
        editObjectData
      );
      
      setQualificationObjects(prev => 
        prev.map(obj => obj.id === editingObject ? updatedObject : obj)
      );
      
      setEditingObject(null);
      setEditObjectData({});
      alert('Объект квалификации успешно обновлен');
    } catch (error) {
      console.error('Ошибка обновления объекта квалификации:', error);
      alert(`Ошибка обновления: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Сохранение информации о договоре
  const handleSaveContractInfo = async () => {
    setOperationLoading(true);
    try {
      await projectService.updateProject(project.id, {
        contractNumber: contractInfo.contractNumber
      });
      
      setEditingContractInfo(false);
      alert('Информация о договоре успешно обновлена');
    } catch (error) {
      console.error('Ошибка обновления информации о договоре:', error);
      alert(`Ошибка обновления: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Отмена редактирования информации о договоре
  const handleCancelContractEdit = () => {
    setContractInfo({
      contractNumber: project.contractNumber || '',
      estimatedCompletionDate: (() => {
        const date = new Date(project.createdAt);
        date.setDate(date.getDate() + 7);
        return date.toISOString().split('T')[0];
      })()
    });
    setEditingContractInfo(false);
  };

  // Загрузка документов
  const handleDocumentUpload = async (documentType: DocumentType, file: File) => {
    // Проверяем формат файла
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      alert('Можно загружать только файлы в формате PDF или DOCX');
      return;
    }

    // Проверяем размер файла (максимум 10 MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Размер файла не должен превышать 10 MB');
      return;
    }

    setUploadingDocument(documentType);

    try {
      const documentData: CreateProjectDocumentData = {
        projectId: project.id,
        documentType,
        file,
        uploadedBy: user?.id
      };

      const savedDocument = await projectDocumentService.saveDocument(documentData);
      
      // Обновляем список документов
      setProjectDocuments(prev => {
        // Удаляем старый документ того же типа если есть
        const filtered = prev.filter(doc => doc.documentType !== documentType);
        return [...filtered, savedDocument];
      });
      
      // Обновляем статус документа
      if (documentType === 'commercial_offer') {
        setCommercialOfferStatus('ready_to_send');
      } else if (documentType === 'contract') {
        setContractStatus('ready_to_send');
      }

      alert(`${DocumentTypeLabels[documentType]} успешно сохранен`);
    } catch (error) {
      console.error('Ошибка сохранения документа:', error);
      alert(`Ошибка сохранения документа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setUploadingDocument(null);
    }
  };

  // Удаление документа
  const handleRemoveDocument = async (documentId: string, documentType: DocumentType) => {
    if (confirm(`Вы уверены, что хотите удалить ${DocumentTypeLabels[documentType].toLowerCase()}?`)) {
      setOperationLoading(true);
      try {
        await projectDocumentService.deleteDocument(documentId);
        
        // Удаляем из локального состояния
        setProjectDocuments(prev => prev.filter(doc => doc.id !== documentId));
        
        // Сбрасываем статус документа
        if (documentType === 'commercial_offer') {
          setCommercialOfferStatus('draft');
        } else if (documentType === 'contract') {
          setContractStatus('draft');
        }
        
        alert(`${DocumentTypeLabels[documentType]} успешно удален`);
      } catch (error) {
        console.error('Ошибка удаления документа:', error);
        alert(`Ошибка удаления документа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      } finally {
        setOperationLoading(false);
      }
    }
  };

  // Скачивание документа
  const handleDownloadDocument = async (document: ProjectDocument) => {
    try {
      setOperationLoading(true);
      
      const blob = await projectDocumentService.getDocumentContent(document.id);
      
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
    } finally {
      setOperationLoading(false);
    }
  };

  // Получение документа по типу
  const getDocumentByType = (documentType: DocumentType): ProjectDocument | null => {
    return projectDocuments.find(doc => doc.documentType === documentType) || null;
  };

  // Отмена редактирования
  const handleCancelEdit = () => {
    setEditingObject(null);
    setEditObjectData({});
  };

  // Рендер полей в зависимости от типа объекта
  const renderObjectFields = (obj: QualificationObject) => {
    if (editingObject !== obj.id) {
      // Режим просмотра
      return (
        <div className="space-y-2">
          {obj.name && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Наименование:</span>
              <span className="ml-2 text-gray-900">{obj.name}</span>
            </div>
          )}
          {obj.address && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Адрес:</span>
              <span className="ml-2 text-gray-900">{obj.address}</span>
            </div>
          )}
          {obj.area && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Площадь:</span>
              <span className="ml-2 text-gray-900">{obj.area} м²</span>
            </div>
          )}
          {obj.climateSystem && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Климатическая установка:</span>
              <span className="ml-2 text-gray-900">{obj.climateSystem}</span>
            </div>
          )}
          {obj.vin && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">VIN:</span>
              <span className="ml-2 text-gray-900">{obj.vin}</span>
            </div>
          )}
          {obj.registrationNumber && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Рег. номер:</span>
              <span className="ml-2 text-gray-900">{obj.registrationNumber}</span>
            </div>
          )}
          {obj.bodyVolume && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Объем кузова:</span>
              <span className="ml-2 text-gray-900">{obj.bodyVolume} м³</span>
            </div>
          )}
          {obj.inventoryNumber && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Инв. номер:</span>
              <span className="ml-2 text-gray-900">{obj.inventoryNumber}</span>
            </div>
          )}
          {obj.chamberVolume && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Объем камеры:</span>
              <span className="ml-2 text-gray-900">{obj.chamberVolume} м³</span>
            </div>
          )}
          {obj.serialNumber && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Серийный номер:</span>
              <span className="ml-2 text-gray-900">{obj.serialNumber}</span>
            </div>
          )}
        </div>
      );
    }

    // Режим редактирования
    return (
      <div className="space-y-3">
        {/* Поля в зависимости от типа объекта */}
        {(obj.type === 'помещение' || obj.type === 'холодильная_камера') && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Наименование</label>
            <input
              type="text"
              value={editObjectData.name || ''}
              onChange={(e) => setEditObjectData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        )}

        {obj.type === 'помещение' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Адрес</label>
              <input
                type="text"
                value={editObjectData.address || ''}
                onChange={(e) => setEditObjectData(prev => ({ ...prev, address: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Площадь (м²)</label>
              <input
                type="number"
                step="0.01"
                value={editObjectData.area || ''}
                onChange={(e) => setEditObjectData(prev => ({ ...prev, area: parseFloat(e.target.value) || undefined }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </>
        )}

        {obj.type === 'автомобиль' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">VIN номер</label>
              <input
                type="text"
                value={editObjectData.vin || ''}
                onChange={(e) => setEditObjectData(prev => ({ ...prev, vin: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Рег. номер</label>
              <input
                type="text"
                value={editObjectData.registrationNumber || ''}
                onChange={(e) => setEditObjectData(prev => ({ ...prev, registrationNumber: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Объем кузова (м³)</label>
              <input
                type="number"
                step="0.01"
                value={editObjectData.bodyVolume || ''}
                onChange={(e) => setEditObjectData(prev => ({ ...prev, bodyVolume: parseFloat(e.target.value) || undefined }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </>
        )}

        {obj.type === 'холодильная_камера' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Инв. номер</label>
              <input
                type="text"
                value={editObjectData.inventoryNumber || ''}
                onChange={(e) => setEditObjectData(prev => ({ ...prev, inventoryNumber: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Объем камеры (м³)</label>
              <input
                type="number"
                step="0.01"
                value={editObjectData.chamberVolume || ''}
                onChange={(e) => setEditObjectData(prev => ({ ...prev, chamberVolume: parseFloat(e.target.value) || undefined }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </>
        )}

        {(obj.type === 'холодильник' || obj.type === 'морозильник') && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Серийный номер</label>
              <input
                type="text"
                value={editObjectData.serialNumber || ''}
                onChange={(e) => setEditObjectData(prev => ({ ...prev, serialNumber: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Инв. номер</label>
              <input
                type="text"
                value={editObjectData.inventoryNumber || ''}
                onChange={(e) => setEditObjectData(prev => ({ ...prev, inventoryNumber: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </>
        )}

        {/* Климатическая установка для всех типов кроме холодильника и морозильника */}
        {!['холодильник', 'морозильник'].includes(obj.type) && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Климатическая установка</label>
            <input
              type="text"
              value={editObjectData.climateSystem || ''}
              onChange={(e) => setEditObjectData(prev => ({ ...prev, climateSystem: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Загрузка данных договора...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <h3 className="text-lg font-semibold text-red-800">Ошибка загрузки данных</h3>
        </div>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={onBack}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Вернуться к проектам
        </button>
      </div>
    );
  }

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
        <Building2 className="w-8 h-8 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Согласование договора</h1>
          <p className="text-gray-600">{project.name}</p>
        </div>
      </div>

      {/* Project Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-blue-900">Информация о договоре</h2>
          <div className="flex space-x-2">
            {editingContractInfo ? (
              <>
                <button
                  onClick={handleSaveContractInfo}
                  disabled={operationLoading}
                  className="text-green-600 hover:text-green-800 transition-colors"
                  title="Сохранить изменения"
                >
                  <Save className="w-5 h-5" />
                </button>
                <button
                  onClick={handleCancelContractEdit}
                  className="text-gray-600 hover:text-gray-800 transition-colors"
                  title="Отменить изменения"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditingContractInfo(true)}
                disabled={operationLoading}
                className="text-indigo-600 hover:text-indigo-800 transition-colors"
                title="Редактировать"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-sm font-medium text-blue-900">Дата создания:</span>
            <div className="text-blue-800">{project.createdAt.toLocaleDateString('ru-RU')}</div>
          </div>
          <div>
            <span className="text-sm font-medium text-blue-900">Примерная дата завершения:</span>
            {editingContractInfo ? (
              <input
                type="date"
                value={contractInfo.estimatedCompletionDate}
                onChange={(e) => setContractInfo(prev => ({ ...prev, estimatedCompletionDate: e.target.value }))}
                className="mt-1 px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : (
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-blue-800 font-medium">
                  {new Date(contractInfo.estimatedCompletionDate).toLocaleDateString('ru-RU')}
                </span>
              </div>
            )}
          </div>
          <div>
            <span className="text-sm font-medium text-blue-900">Номер договора:</span>
            {editingContractInfo ? (
              <input
                type="text"
                value={contractInfo.contractNumber}
                onChange={(e) => setContractInfo(prev => ({ ...prev, contractNumber: e.target.value }))}
                className="mt-1 w-full px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Введите номер договора"
              />
            ) : (
              <div className="text-blue-800">{contractInfo.contractNumber || 'Не указан'}</div>
            )}
          </div>
        </div>
      </div>

      {/* Contractor Information (Read-only) */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Информация о контрагенте</h2>
        
        {contractor ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Наименование</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                  {contractor.name}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Адрес</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                  {contractor.address || 'Не указан'}
                </div>
              </div>
            </div>

            {/* Contacts */}
            {contractor.contacts.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Контакты</label>
                <div className="space-y-2">
                  {contractor.contacts.map((contact) => (
                    <div key={contact.id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm font-medium text-gray-900">{contact.employeeName}</div>
                      {contact.phone && (
                        <div className="text-sm text-gray-600">📞 {contact.phone}</div>
                      )}
                      {contact.comment && (
                        <div className="text-xs text-gray-500">{contact.comment}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <p>Информация о контрагенте недоступна</p>
          </div>
        )}
      </div>

      {/* Qualification Objects (Editable) */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Объекты квалификации</h2>
        
        {qualificationObjects.length > 0 ? (
          <div className="space-y-4">
            {qualificationObjects.map((obj) => (
              <div key={obj.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {QualificationObjectTypeLabels[obj.type]}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Создан: {obj.createdAt.toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    {editingObject === obj.id ? (
                      <>
                        <button
                          onClick={handleSaveObject}
                          disabled={operationLoading}
                          className="text-green-600 hover:text-green-800 transition-colors"
                          title="Сохранить изменения"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="text-gray-600 hover:text-gray-800 transition-colors"
                          title="Отменить изменения"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleEditObject(obj)}
                        disabled={operationLoading}
                        className="text-indigo-600 hover:text-indigo-800 transition-colors"
                        title="Редактировать"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {renderObjectFields(obj)}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Объекты квалификации не найдены</p>
            <p className="text-sm">Проверьте настройки проекта</p>
          </div>
        )}
      </div>

      {/* Commercial Offer Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Коммерческое предложение</h2>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">Статус:</span>
            <select
              value={commercialOfferStatus}
              onChange={(e) => setCommercialOfferStatus(e.target.value as DocumentStatus)}
              className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            >
              {Object.entries(DocumentStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Commercial Offer Document */}
        {(() => {
          const document = getDocumentByType('commercial_offer');
          return document ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {document.fileName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(document.fileSize / 1024 / 1024).toFixed(2)} MB
                    </div>
                    <div className="text-xs text-gray-500">
                      Загружен: {document.uploadedAt.toLocaleString('ru-RU')}
                      {document.uploadedByName && ` • ${document.uploadedByName}`}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleDownloadDocument(document)}
                    disabled={operationLoading}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                    title="Скачать"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRemoveDocument(document.id, 'commercial_offer')}
                    disabled={operationLoading}
                    className="text-red-600 hover:text-red-800 transition-colors"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {uploadingDocument === 'commercial_offer' ? (
                <div className="flex flex-col items-center space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <span className="text-sm text-gray-600">Сохранение документа...</span>
                </div>
              ) : (
                <>
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleDocumentUpload('commercial_offer', file);
                      }
                    }}
                    className="hidden"
                    id="commercial-offer-upload"
                  />
                  <label
                    htmlFor="commercial-offer-upload"
                    className="cursor-pointer flex flex-col items-center space-y-2"
                  >
                    <Upload className="w-8 h-8 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Загрузить коммерческое предложение
                    </span>
                    <span className="text-xs text-gray-500">
                      PDF или DOCX, до 10 MB
                    </span>
                  </label>
                </>
              )}
            </div>
          );
        })()}
        
        {/* Status Badge */}
        <div className="mt-4 flex justify-center">
          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${DocumentStatusColors[commercialOfferStatus]}`}>
            {DocumentStatusLabels[commercialOfferStatus]}
          </span>
        </div>

        {/* Instructions */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Требования к коммерческому предложению:</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Поддерживаемые форматы: PDF, DOCX</li>
            <li>• Максимальный размер файла: 10 MB</li>
            <li>• Документ сохраняется в базе данных проекта</li>
            <li>• При загрузке нового документа старый автоматически заменяется</li>
            <li>• Документ доступен для скачивания всем участникам проекта</li>
          </ul>
        </div>
      </div>

      {/* Contract Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Действия по договору</h2>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">Статус:</span>
            <select
              value={contractStatus}
              onChange={(e) => setContractStatus(e.target.value as DocumentStatus)}
              className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            >
              {Object.entries(DocumentStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Contract Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-semibold text-blue-900">Договор</h3>
            <div className="flex space-x-2">
              {editingContractInfo ? (
                <>
                  <button
                    onClick={handleSaveContractInfo}
                    disabled={operationLoading}
                    className="text-green-600 hover:text-green-800 transition-colors"
                    title="Сохранить изменения"
                  >
                    <Save className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleCancelContractEdit}
                    className="text-gray-600 hover:text-gray-800 transition-colors"
                    title="Отменить изменения"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditingContractInfo(true)}
                  disabled={operationLoading}
                  className="text-indigo-600 hover:text-indigo-800 transition-colors"
                  title="Редактировать"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-sm font-medium text-blue-900">Дата создания:</span>
              <div className="text-blue-800">{project.createdAt.toLocaleDateString('ru-RU')}</div>
            </div>
            <div>
              <span className="text-sm font-medium text-blue-900">Примерная дата завершения:</span>
              {editingContractInfo ? (
                <input
                  type="date"
                  value={contractInfo.estimatedCompletionDate}
                  onChange={(e) => setContractInfo(prev => ({ ...prev, estimatedCompletionDate: e.target.value }))}
                  className="mt-1 px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-800 font-medium">
                    {new Date(contractInfo.estimatedCompletionDate).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-blue-900">Номер договора:</span>
              {editingContractInfo ? (
                <input
                  type="text"
                  value={contractInfo.contractNumber}
                  onChange={(e) => setContractInfo(prev => ({ ...prev, contractNumber: e.target.value }))}
                  className="mt-1 w-full px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Введите номер договора"
                />
              ) : (
                <div className="text-blue-800">{contractInfo.contractNumber || 'Не указан'}</div>
              )}
            </div>
          </div>
        </div>
        
        {/* Contract Document Upload */}
        <div className="mb-6">
          <h3 className="text-md font-medium text-gray-800 mb-3">Загрузка договора</h3>
          {(() => {
            const document = getDocumentByType('contract');
            return document ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-green-600" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {document.fileName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(document.fileSize / 1024 / 1024).toFixed(2)} MB
                      </div>
                      <div className="text-xs text-gray-500">
                        Загружен: {document.uploadedAt.toLocaleString('ru-RU')}
                        {document.uploadedByName && ` • ${document.uploadedByName}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDownloadDocument(document)}
                      disabled={operationLoading}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="Скачать"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveDocument(document.id, 'contract')}
                      disabled={operationLoading}
                      className="text-red-600 hover:text-red-800 transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {uploadingDocument === 'contract' ? (
                  <div className="flex flex-col items-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <span className="text-sm text-gray-600">Сохранение документа...</span>
                  </div>
                ) : (
                  <>
                    <input
                      type="file"
                      accept=".pdf,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleDocumentUpload('contract', file);
                        }
                      }}
                      className="hidden"
                      id="contract-upload"
                    />
                    <label
                      htmlFor="contract-upload"
                      className="cursor-pointer flex flex-col items-center space-y-2"
                    >
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Загрузить договор
                      </span>
                      <span className="text-xs text-gray-500">
                        PDF или DOCX, до 10 MB
                      </span>
                    </label>
                  </>
                )}
              </div>
            );
          })()}
        </div>
        
        {/* Contract Status Badge */}
        <div className="mb-6 flex justify-center">
          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${DocumentStatusColors[contractStatus]}`}>
            {DocumentStatusLabels[contractStatus]}
          </span>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="text-sm font-medium text-green-900">Готовность к согласованию</h3>
              <p className="text-sm text-green-700">
                Информация о контрагенте и объектах квалификации проверена и готова для согласования договора
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={onBack}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Завершить согласование</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};