import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, AlertTriangle, Upload, Download, Eye, Trash2, CheckCircle, Edit2, X, Plus, FileImage } from 'lucide-react';
import { Project } from '../types/Project';
import { QualificationObject } from '../types/QualificationObject';
import { Equipment } from '../types/Equipment';
import { projectDocumentService, ProjectDocument } from '../utils/projectDocumentService';
import { qualificationObjectService } from '../utils/qualificationObjectService';
import { equipmentService } from '../utils/equipmentService';
import { equipmentAssignmentService } from '../utils/equipmentAssignmentService';
import { useAuth } from '../contexts/AuthContext';
import { ProjectInfo } from './contract/ProjectInfo';
import { QualificationObjectForm } from './QualificationObjectForm';

interface TestingExecutionProps {
  project: Project;
  onBack: () => void;
}

export const TestingExecution: React.FC<TestingExecutionProps> = ({ project, onBack }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [testDataDocuments, setTestDataDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qualificationObjects, setQualificationObjects] = useState<QualificationObject[]>([]);
  const [editingObject, setEditingObject] = useState<QualificationObject | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [equipmentPlacements, setEquipmentPlacements] = useState<{
    [objectId: string]: {
      zones: {
        zoneNumber: number;
        levels: {
          levelValue: number;
          equipmentId: string;
          equipmentName?: string;
        }[];
      }[];
    };
  }>({});
  const [equipmentSearch, setEquipmentSearch] = useState<{ [key: string]: string }>({});
  const [showEquipmentDropdown, setShowEquipmentDropdown] = useState<{ [key: string]: boolean }>({});
  const [objectTestDocuments, setObjectTestDocuments] = useState<ProjectDocument[]>([]);
  const [testDocumentUploading, setTestDocumentUploading] = useState<{ [key: string]: boolean }>({});

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
      
      // Фильтруем данные испытаний (используем тип test_data для данных испытаний)
      const testData = docs.filter(doc => doc.documentType === 'test_data');
      setTestDataDocuments(testData);
      
      // Фильтруем документы испытаний
      const testDocs = docs.filter(doc => doc.documentType === 'test_data');
      setObjectTestDocuments(testDocs);
      
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
      console.log('Загружены выбранные объекты квалификации для испытаний:', selectedObjects.length);
      
      // Инициализируем размещения оборудования для каждого объекта
      const initialPlacements: typeof equipmentPlacements = {};
      for (const obj of selectedObjects) {
        await loadEquipmentPlacement(obj.id);
      }
    } catch (error) {
      console.error('Ошибка загрузки объектов квалификации:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    }
  };

  useEffect(() => {
    loadDocuments();
    loadEquipment();
  }, [project.id]);

  // Загрузка оборудования
  const loadEquipment = async () => {
    if (!equipmentService.isAvailable()) {
      return;
    }

    try {
      const result = await equipmentService.getAllEquipment(1, 1000); // Загружаем все оборудование
      setEquipment(result.equipment);
    } catch (error) {
      console.error('Ошибка загрузки оборудования:', error);
    }
  };

  // Загрузка данных испытаний
  const handleTestDataUpload = async (file: File) => {
    if (!file) return;

    // Проверяем тип файла
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!allowedTypes.includes(file.type)) {
      alert('Поддерживаются файлы: PDF, DOC, DOCX, CSV, XLS, XLSX');
      return;
    }

    setUploading(true);

    try {
      const uploadedDoc = await projectDocumentService.uploadDocument(
        project.id, 
        'test_data', // Используем test_data для данных испытаний
        file, 
        user?.id
      );
      
      // Обновляем список данных испытаний
      setTestDataDocuments(prev => [...prev, uploadedDoc]);
      alert('Данные испытаний успешно загружены');
    } catch (error) {
      console.error('Ошибка загрузки данных испытаний:', error);
      alert(`Ошибка загрузки данных испытаний: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setUploading(false);
    }
  };

  // Удаление данных испытаний
  const handleDeleteTestData = async (documentId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эти данные испытаний?')) {
      return;
    }

    try {
      await projectDocumentService.deleteDocument(documentId);
      setTestDataDocuments(prev => prev.filter(doc => doc.id !== documentId));
      alert('Данные испытаний успешно удалены');
    } catch (error) {
      console.error('Ошибка удаления данных испытаний:', error);
      alert(`Ошибка удаления данных испытаний: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  // Скачивание данных испытаний
  const handleDownloadTestData = async (document: ProjectDocument) => {
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
      console.error('Ошибка скачивания данных испытаний:', error);
      alert(`Ошибка скачивания данных испытаний: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  // Просмотр данных испытаний
  const handleViewTestData = (document: ProjectDocument) => {
    window.open(document.fileUrl, '_blank');
  };

  // Получение документов испытаний для конкретного объекта квалификации
  const getObjectTestDocuments = (qualificationObjectId: string) => {
    return objectTestDocuments.filter(doc => doc.qualificationObjectId === qualificationObjectId);
  };

  // Загрузка документа испытания для объекта квалификации
  const handleTestDocumentUpload = async (qualificationObjectId: string, file: File) => {
    if (!file) return;

    // Проверяем тип файла - только JPG
    const allowedTypes = ['image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      alert('Поддерживаются только файлы JPG');
      return;
    }

    // Проверяем размер файла (максимум 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('Размер файла не должен превышать 10MB');
      return;
    }

    setUploading(true);

    try {
      const uploadedDoc = await projectDocumentService.uploadDocument(
        project.id, 
        'test_data', // Используем test_data для документов испытаний
        file, 
        user?.id,
        qualificationObjectId // Передаем ID объекта квалификации
      );
      
      // Обновляем список документов испытаний для объектов
      setObjectTestDocuments(prev => [...prev, uploadedDoc]);
      alert('JPG документ испытания успешно загружен в базу данных');
    } catch (error) {
      console.error('Ошибка загрузки документа испытания:', error);
      alert(`Ошибка загрузки документа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setUploading(false);
    }
  };

  // Удаление документа испытания
  const handleDeleteTestDocument = async (documentId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот документ испытания?')) {
      return;
    }

    try {
      await projectDocumentService.deleteDocument(documentId);
      setObjectTestDocuments(prev => prev.filter(doc => doc.id !== documentId));
      alert('JPG документ успешно удален из базы данных');
    } catch (error) {
      console.error('Ошибка удаления документа испытания:', error);
      alert(`Ошибка удаления документа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  // Скачивание документа испытания
  const handleDownloadTestDocument = async (document: ProjectDocument) => {
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
      console.error('Ошибка скачивания документа испытания:', error);
      alert(`Ошибка скачивания документа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  // Просмотр документа испытания
  const handleViewTestDocument = (document: ProjectDocument) => {
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

  // Управление размещением оборудования
  const addZone = (objectId: string) => {
    setEquipmentPlacements(prev => {
      const currentPlacements = prev[objectId] || { zones: [] };
      const maxZoneNumber = Math.max(0, ...currentPlacements.zones.map(z => z.zoneNumber));
      
      // Получаем уровни из предыдущей зоны для копирования
      const previousZone = currentPlacements.zones[currentPlacements.zones.length - 1];
      const levelsFromPrevious = previousZone ? previousZone.levels.map(level => ({
        levelValue: level.levelValue,
        equipmentId: '',
        equipmentName: ''
      })) : [];
      
      return {
        ...prev,
        [objectId]: {
          zones: [
            ...currentPlacements.zones,
            { zoneNumber: maxZoneNumber + 1, levels: levelsFromPrevious }
          ]
        }
      };
    });
  };

  const removeZone = (objectId: string, zoneIndex: number) => {
    setEquipmentPlacements(prev => ({
      ...prev,
      [objectId]: {
        zones: prev[objectId]?.zones.filter((_, index) => index !== zoneIndex) || []
      }
    }));
  };

  const addLevel = (objectId: string, zoneIndex: number) => {
    setEquipmentPlacements(prev => {
      const currentPlacements = prev[objectId] || { zones: [] };
      const updatedZones = [...currentPlacements.zones];
      
      if (updatedZones[zoneIndex]) {
        updatedZones[zoneIndex] = {
          ...updatedZones[zoneIndex],
          levels: [
            ...updatedZones[zoneIndex].levels,
            { levelValue: 0, equipmentId: '', equipmentName: '' }
          ]
        };
      }
      
      return {
        ...prev,
        [objectId]: { zones: updatedZones }
      };
    });
  };

  const removeLevel = (objectId: string, zoneIndex: number, levelIndex: number) => {
    setEquipmentPlacements(prev => {
      const currentPlacements = prev[objectId] || { zones: [] };
      const updatedZones = [...currentPlacements.zones];
      
      if (updatedZones[zoneIndex]) {
        updatedZones[zoneIndex] = {
          ...updatedZones[zoneIndex],
          levels: updatedZones[zoneIndex].levels.filter((_, index) => index !== levelIndex)
        };
      }
      
      return {
        ...prev,
        [objectId]: { zones: updatedZones }
      };
    });
  };

  const updateLevel = (objectId: string, zoneIndex: number, levelIndex: number, field: 'levelValue' | 'equipmentId', value: any) => {
    setEquipmentPlacements(prev => {
      const currentPlacements = prev[objectId] || { zones: [] };
      const updatedZones = [...currentPlacements.zones];
      
      if (updatedZones[zoneIndex] && updatedZones[zoneIndex].levels[levelIndex]) {
        const updatedLevels = [...updatedZones[zoneIndex].levels];
        updatedLevels[levelIndex] = {
          ...updatedLevels[levelIndex],
          [field]: value
        };
        
        // Если выбрано оборудование, сохраняем его название
        if (field === 'equipmentId' && value) {
          const selectedEquipment = equipment.find(eq => eq.id === value);
          if (selectedEquipment) {
            updatedLevels[levelIndex].equipmentName = selectedEquipment.name;
          }
        }
        
        updatedZones[zoneIndex] = {
          ...updatedZones[zoneIndex],
          levels: updatedLevels
        };
      }
      
      return {
        ...prev,
        [objectId]: { zones: updatedZones }
      };
    });
  };

  // Фильтрация оборудования по поиску
  const getFilteredEquipment = (searchTerm: string) => {
    if (!searchTerm.trim()) return equipment;
    
    return equipment.filter(eq =>
      eq.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Получение названия оборудования по ID
  const getEquipmentName = (equipmentId: string) => {
    const eq = equipment.find(e => e.id === equipmentId);
    return eq ? eq.name : 'Выберите оборудование';
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

  // Получение иконки для типа файла
  const getFileTypeIcon = (mimeType: string) => {
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      return <FileImage className="w-5 h-5 text-blue-600" />;
    } else {
      return <FileImage className="w-5 h-5 text-gray-600" />;
    }
  };

  // Форматирование размера файла
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Сохранение размещения оборудования
  const handleSaveEquipmentPlacement = async (objectId: string) => {
    if (!equipmentAssignmentService.isAvailable()) {
      alert('Supabase не настроен для сохранения размещения оборудования');
      return;
    }

    const placement = equipmentPlacements[objectId];
    if (!placement || placement.zones.length === 0) {
      alert('Нет данных для сохранения');
      return;
    }

    setOperationLoading(true);
    try {
      await equipmentAssignmentService.saveEquipmentPlacement(
        project.id,
        objectId,
        placement
      );
      
      alert('Размещение оборудования успешно сохранено');
    } catch (error) {
      console.error('Ошибка сохранения размещения оборудования:', error);
      alert(`Ошибка сохранения размещения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Загрузка размещения оборудования при редактировании объекта
  const loadEquipmentPlacement = async (objectId: string) => {
    if (!equipmentAssignmentService.isAvailable()) {
      return;
    }

    try {
      const placement = await equipmentAssignmentService.getEquipmentPlacement(project.id, objectId);
      
      if (placement.zones.length > 0) {
        setEquipmentPlacements(prev => ({
          ...prev,
          [objectId]: placement
        }));
      } else {
        // Инициализируем пустое размещение если нет сохраненных данных
        setEquipmentPlacements(prev => ({
          ...prev,
          [objectId]: {
            zones: [{ zoneNumber: 1, levels: [] }]
          }
        }));
      }
    } catch (error) {
      console.error('Ошибка загрузки размещения оборудования:', error);
      // Инициализируем пустое размещение при ошибке
      setEquipmentPlacements(prev => ({
        ...prev,
        [objectId]: {
          zones: [{ zoneNumber: 1, levels: [] }]
        }
      }));
    }
  };

  // Получение протокола из документов
  const protocolDoc = documents.find(doc => doc.documentType === 'layout_scheme');

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
        <h1 className="text-2xl font-bold text-gray-900">Проведение испытаний</h1>
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

      {/* Protocol Link */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Протокол</h3>
        
        {protocolDoc ? (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="w-8 h-8 text-green-600" />
                <div>
                  <h4 className="font-medium text-gray-900">
                    {protocolDoc.fileName}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(protocolDoc.fileSize)} • 
                    Загружен {protocolDoc.uploadedAt.toLocaleDateString('ru-RU')}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleViewTestData(protocolDoc)}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                  title="Просмотреть протокол"
                >
                  <Eye className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">Протокол не найден</p>
            <p className="text-sm text-gray-400">
              Протокол должен быть загружен на этапе подготовки протокола
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
            <div className="space-y-6">
              {/* Основная форма объекта квалификации */}
              <QualificationObjectForm
                contractorId={project.contractorId}
                contractorAddress={editingObject.address}
                initialData={editingObject}
                onSubmit={handleUpdateQualificationObject}
                onCancel={() => setEditingObject(null)}
                hideTypeSelection={true}
              />
              
              {/* Блок размещения измерительного оборудования */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Размещение измерительного оборудования</h4>
                
                {equipmentPlacements[editingObject.id]?.zones.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                    <p className="text-sm">Зоны измерения не добавлены</p>
                    <p className="text-xs mt-1">Нажмите "Добавить зону" для создания первой зоны</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {equipmentPlacements[editingObject.id]?.zones.map((zone, zoneIndex) => (
                      <div key={zoneIndex} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="font-medium text-gray-900">
                            Зона измерения № {zone.zoneNumber}
                          </h5>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => removeZone(editingObject.id, zoneIndex)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                              title="Удалить зону"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        {zone.levels.length === 0 ? (
                          <div className="text-center py-4 text-gray-500 bg-white rounded border border-gray-200">
                            <p className="text-sm">Уровни измерения не добавлены</p>
                            <p className="text-xs mt-1">Нажмите "Добавить уровень" для создания первого уровня</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {zone.levels.map((level, levelIndex) => {
                              const searchKey = `${editingObject.id}-${zoneIndex}-${levelIndex}`;
                              const filteredEquipment = getFilteredEquipment(equipmentSearch[searchKey] || '');
                              
                              return (
                                <div key={levelIndex} className="bg-white border border-gray-200 rounded p-3">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1">
                                        Уровень измерения (м)
                                      </label>
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={level.levelValue}
                                        onChange={(e) => updateLevel(
                                          editingObject.id, 
                                          zoneIndex, 
                                          levelIndex, 
                                          'levelValue', 
                                          parseFloat(e.target.value) || 0
                                        )}
                                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="0.0"
                                      />
                                    </div>
                                    
                                    <div className="relative">
                                      <label className="block text-xs text-gray-500 mb-1">
                                        Оборудование
                                      </label>
                                      <div className="flex items-center space-x-2">
                                        <div className="relative flex-1">
                                          <input
                                            type="text"
                                            value={level.equipmentId ? getEquipmentName(level.equipmentId) : (equipmentSearch[searchKey] || '')}
                                            onChange={(e) => {
                                              setEquipmentSearch(prev => ({
                                                ...prev,
                                                [searchKey]: e.target.value
                                              }));
                                              if (!level.equipmentId) {
                                                setShowEquipmentDropdown(prev => ({
                                                  ...prev,
                                                  [searchKey]: true
                                                }));
                                              }
                                            }}
                                            onFocus={() => {
                                              setShowEquipmentDropdown(prev => ({
                                                ...prev,
                                                [searchKey]: true
                                              }));
                                              if (level.equipmentId) {
                                                setEquipmentSearch(prev => ({
                                                  ...prev,
                                                  [searchKey]: ''
                                                }));
                                                updateLevel(editingObject.id, zoneIndex, levelIndex, 'equipmentId', '');
                                              }
                                            }}
                                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="Поиск оборудования..."
                                          />
                                          
                                          {showEquipmentDropdown[searchKey] && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                              {filteredEquipment.length > 0 ? (
                                                filteredEquipment.map((eq) => (
                                                  <div
                                                    key={eq.id}
                                                    onClick={() => {
                                                      updateLevel(editingObject.id, zoneIndex, levelIndex, 'equipmentId', eq.id);
                                                      setEquipmentSearch(prev => ({
                                                        ...prev,
                                                        [searchKey]: ''
                                                      }));
                                                      setShowEquipmentDropdown(prev => ({
                                                        ...prev,
                                                        [searchKey]: false
                                                      }));
                                                    }}
                                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                                  >
                                                    <div className="font-medium text-gray-900">{eq.name}</div>
                                                  </div>
                                                ))
                                              ) : (
                                                <div className="px-3 py-2 text-gray-500 text-sm">
                                                  Оборудование не найдено
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        
                                        <button
                                          onClick={() => removeLevel(editingObject.id, zoneIndex, levelIndex)}
                                          className="text-red-600 hover:text-red-800 transition-colors"
                                          title="Удалить уровень"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* Кнопка добавления уровня под зоной */}
                        <div className="mt-3 flex justify-center">
                          <button
                            onClick={() => addLevel(editingObject.id, zoneIndex)}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors flex items-center space-x-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Добавить уровень</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Кнопка добавления зоны под списком зон */}
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => addZone(editingObject.id)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Добавить зону</span>
                  </button>
                </div>
                
                {/* Кнопка сохранения размещения оборудования */}
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => handleSaveEquipmentPlacement(editingObject.id)}
                    disabled={operationLoading}
                    className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {operationLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Сохранение...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Сохранить размещение</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Блок загрузки документов о проведенных испытаниях */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Документы о проведенных испытаниях</h4>
                
                {/* Загрузка нового документа */}
                <div className="mb-6">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <input
                      type="file"
                      accept=".jpg,.jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleTestDocumentUpload(editingObject.id, file);
                        }
                      }}
                      className="hidden"
                      id={`test-document-upload-${editingObject.id}`}
                    />
                    <label
                      htmlFor={`test-document-upload-${editingObject.id}`}
                      className="cursor-pointer flex flex-col items-center space-y-2"
                    >
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Загрузить JPG документ испытания
                      </span>
                      <span className="text-xs text-gray-500">
                        Поддерживаются только JPG файлы до 10MB
                      </span>
                    </label>
                  </div>
                </div>

                {/* Список загруженных документов */}
                <div>
                  {getObjectTestDocuments(editingObject.id).length > 0 ? (
                    <div className="space-y-3">
                      {getObjectTestDocuments(editingObject.id).map((document) => (
                        <div key={document.id} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {document.mimeType.startsWith('image/') ? (
                                <FileImage className="w-6 h-6 text-blue-600" />
                              ) : (
                                <FileText className="w-6 h-6 text-red-600" />
                              )}
                              <div>
                                <h5 className="font-medium text-gray-900">
                                  {document.fileName}
                                </h5>
                                <p className="text-sm text-gray-500">
                                  {formatFileSize(document.fileSize)} • 
                                  Загружен {document.uploadedAt.toLocaleDateString('ru-RU')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleViewTestDocument(document)}
                                className="text-blue-600 hover:text-blue-800 transition-colors"
                                title="Просмотреть документ"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDownloadTestDocument(document)}
                                className="text-green-600 hover:text-green-800 transition-colors"
                                title="Скачать документ"
                              >
                                <Download className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTestDocument(document.id)}
                                className="text-red-600 hover:text-red-800 transition-colors"
                                title="Удалить документ"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">Документы испытаний не загружены</p>
                      <p className="text-xs mt-1">Загрузите изображения или PDF файлы с результатами испытаний</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Кнопки управления формой в конце блока */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setEditingObject(null)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={() => handleUpdateQualificationObject(editingObject)}
                    disabled={operationLoading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {operationLoading ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </div>
            </div>
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
                      onClick={() => {
                        setEditingObject(object);
                        loadEquipmentPlacement(object.id);
                      }}
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

      {/* Test Data Upload */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Данные испытаний</h3>
          {testDataDocuments.length === 0 && (
            <label className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer flex items-center space-x-2">
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Загрузка...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Загрузить данные испытаний</span>
                </>
              )}
              <input
                type="file"
                accept=".pdf,.doc,.docx,.csv,.xls,.xlsx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleTestDataUpload(file);
                  }
                }}
                className="hidden"
                disabled={uploading}
              />
            </label>
          )}
        </div>

        {testDataDocuments.length > 0 ? (
          <div className="space-y-4">
            {testDataDocuments.map((testData) => (
              <div key={testData.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-8 h-8 text-blue-600" />
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {testData.fileName}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(testData.fileSize)} • 
                        Загружен {testData.uploadedAt.toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewTestData(testData)}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="Просмотреть данные испытаний"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDownloadTestData(testData)}
                      className="text-green-600 hover:text-green-800 transition-colors"
                      title="Скачать данные испытаний"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTestData(testData.id)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                      title="Удалить данные испытаний"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Кнопка для загрузки дополнительных данных испытаний */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <label className="cursor-pointer flex flex-col items-center space-y-2">
                <Upload className="w-8 h-8 text-gray-400" />
                <span className="text-sm text-gray-600">
                  Загрузить дополнительные данные испытаний
                </span>
                <span className="text-xs text-gray-500">
                  Поддерживаются файлы PDF, DOC, DOCX, CSV, XLS, XLSX
                </span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.csv,.xls,.xlsx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleTestDataUpload(file);
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
            <p className="text-gray-500 mb-2">Данные испытаний не загружены</p>
            <p className="text-sm text-gray-400">Поддерживаются файлы PDF, DOC, DOCX, CSV, XLS, XLSX</p>
          </div>
        )}
      </div>

      {/* Status Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Статус проведения испытаний</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              {protocolDoc ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              )}
              <span className="font-medium text-gray-900">Протокол</span>
            </div>
            <span className={`text-sm px-2 py-1 rounded-full ${
              protocolDoc 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {protocolDoc ? 'Доступен' : 'Не найден'}
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              {testDataDocuments.length > 0 ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              )}
              <span className="font-medium text-gray-900">Данные испытаний</span>
            </div>
            <span className={`text-sm px-2 py-1 rounded-full ${
              testDataDocuments.length > 0 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {testDataDocuments.length > 0 ? `Загружено (${testDataDocuments.length})` : 'Ожидает загрузки'}
            </span>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Прогресс проведения испытаний</span>
            <span className="text-sm text-gray-500">
              {(protocolDoc ? 1 : 0) + (testDataDocuments.length > 0 ? 1 : 0)} из 2 этапов
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${((protocolDoc ? 1 : 0) + (testDataDocuments.length > 0 ? 1 : 0)) / 2 * 100}%` 
              }}
            ></div>
          </div>
        </div>

        {/* Completion status */}
        {protocolDoc && testDataDocuments.length > 0 && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">
                Испытания проведены! Проект готов к переходу на этап подготовки отчета.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Инструкции по проведению испытаний:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Проверьте протокол:</strong> Убедитесь, что протокол загружен и доступен</li>
          <li>• <strong>Отредактируйте объекты квалификации:</strong> Проверьте и при необходимости обновите данные выбранных объектов</li>
          <li>• <strong>Настройте размещение оборудования:</strong> Определите зоны и уровни измерения для каждого объекта</li>
          <li>• <strong>Загрузите данные испытаний:</strong> Подготовьте и загрузите результаты испытаний</li>
          <li>• <strong>Проверьте документы:</strong> Используйте кнопки просмотра для проверки</li>
          <li>• <strong>Замена данных:</strong> При необходимости можно загрузить новые версии данных</li>
          <li>• <strong>Переход к отчету:</strong> После загрузки данных проект готов к подготовке отчета</li>
        </ul>
      </div>
    </div>
  );
};