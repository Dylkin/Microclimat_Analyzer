import React from 'react';
import { ArrowLeft, Download, Upload, Trash2, Clock, CheckCircle, XCircle, Loader, BarChart, FolderOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UploadedFile } from '../types/FileData';
import { Contractor } from '../types/Contractor';
import { QualificationObject } from '../types/QualificationObject';
import { ProjectStatusLabels, ProjectStatus, Project } from '../types/Project';
import { contractorService } from '../utils/contractorService';
import { qualificationObjectService } from '../utils/qualificationObjectService';
import { databaseService } from '../utils/database';
import { uploadedFileService } from '../utils/uploadedFileService';
import { VI2ParsingService } from '../utils/vi2Parser';
import { TimeSeriesAnalyzer } from './TimeSeriesAnalyzer';
import { projectEquipmentService, ProjectEquipmentAssignment } from '../utils/projectEquipmentService';
import { measurementEquipmentService } from '../utils/measurementEquipmentService';
import { MeasurementEquipment } from '../types/MeasurementEquipment';

interface DataExportProps {
  project: Project;
  onBack: () => void;
}

export const DataExport: React.FC<DataExportProps> = ({ project, onBack }) => {
  const { user } = useAuth();
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([]);
  const [contractors, setContractors] = React.useState<Contractor[]>([]);
  const [qualificationObjects, setQualificationObjects] = React.useState<QualificationObject[]>([]);
  const [selectedContractor, setSelectedContractor] = React.useState<string>(project.contractorId);
  const [selectedQualificationObject, setSelectedQualificationObject] = React.useState<string>('');
  const [qualificationSearch, setQualificationSearch] = React.useState('');
  const [showQualificationDropdown, setShowQualificationDropdown] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState<{
    isSaving: boolean;
    lastSaved: Date | null;
    error: string | null;
  }>({
    isSaving: false,
    lastSaved: null,
    error: null
  });
  const [operationLoading, setOperationLoading] = React.useState(false);
  const [showVisualization, setShowVisualization] = React.useState(false);
  const [equipmentAssignments, setEquipmentAssignments] = React.useState<ProjectEquipmentAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = React.useState(false);
  const [measurementEquipment, setMeasurementEquipment] = React.useState<MeasurementEquipment[]>([]);

  // Загрузка контрагентов при инициализации
  React.useEffect(() => {
    const loadContractors = async () => {
      if (!contractorService.isAvailable()) return;
      
      try {
        const data = await contractorService.getAllContractors();
        setContractors(data);
      } catch (error) {
        console.error('Ошибка загрузки контрагентов:', error);
      }
    };

    loadContractors();
  }, []);

  // Загрузка измерительного оборудования при инициализации
  React.useEffect(() => {
    const loadMeasurementEquipment = async () => {
      if (!measurementEquipmentService.isAvailable()) return;
      
      try {
        const data = await measurementEquipmentService.getAllEquipment();
        setMeasurementEquipment(data);
      } catch (error) {
        console.error('Ошибка загрузки измерительного оборудования:', error);
      }
    };

    loadMeasurementEquipment();
  }, []);

  // Загрузка объектов квалификации при выборе контрагента
  React.useEffect(() => {
    const loadQualificationObjects = async () => {
      if (!selectedContractor || !qualificationObjectService.isAvailable()) {
        setQualificationObjects([]);
        setSelectedQualificationObject('');
        return;
      }
      
      try {
        const data = await qualificationObjectService.getQualificationObjects(selectedContractor);
        
        // Фильтруем объекты квалификации по проекту
        const projectObjectIds = project.qualificationObjects.map(obj => obj.qualificationObjectId);
        const filteredData = data.filter(obj => projectObjectIds.includes(obj.id));
        setQualificationObjects(filteredData);
        
        setSelectedQualificationObject(''); // Сбрасываем выбор объекта при смене контрагента
      } catch (error) {
        console.error('Ошибка загрузки объектов квалификации:', error);
        setQualificationObjects([]);
      }
    };

    loadQualificationObjects();
  }, [selectedContractor, project]);

  // Загрузка назначений оборудования при выборе объекта квалификации
  React.useEffect(() => {
    const loadEquipmentAssignments = async () => {
      if (!selectedQualificationObject || !projectEquipmentService.isAvailable()) {
        setEquipmentAssignments([]);
        return;
      }

      setLoadingAssignments(true);
      try {
        const assignments = await projectEquipmentService.getEquipmentPlacement(
          project.id,
          selectedQualificationObject
        );
        setEquipmentAssignments(assignments);
        console.log('Загружены назначения оборудования:', assignments.length);
      } catch (error) {
        console.error('Ошибка загрузки назначений оборудования:', error);
        setEquipmentAssignments([]);
      } finally {
        setLoadingAssignments(false);
      }
    };

    loadEquipmentAssignments();
  }, [selectedQualificationObject, project.id]);

  // Фильтрация объектов квалификации по поиску
  const filteredQualificationObjects = React.useMemo(() => {
    if (!qualificationSearch.trim()) return qualificationObjects;
    
    return qualificationObjects.filter(obj =>
      (obj.name && obj.name.toLowerCase().includes(qualificationSearch.toLowerCase())) ||
      (obj.address && obj.address.toLowerCase().includes(qualificationSearch.toLowerCase())) ||
      (obj.vin && obj.vin.toLowerCase().includes(qualificationSearch.toLowerCase())) ||
      (obj.serialNumber && obj.serialNumber.toLowerCase().includes(qualificationSearch.toLowerCase())) ||
      (obj.inventoryNumber && obj.inventoryNumber.toLowerCase().includes(qualificationSearch.toLowerCase()))
    );
  }, [qualificationObjects, qualificationSearch]);

  // Получение названия контрагента по ID
  const getContractorName = (contractorId: string) => {
    const contractor = contractors.find(c => c.id === contractorId);
    return contractor ? contractor.name : 'Выберите контрагента';
  };

  // Получение названия объекта квалификации по ID
  const getQualificationObjectName = (objectId: string) => {
    const obj = qualificationObjects.find(o => o.id === objectId);
    if (!obj) return 'Выберите объект квалификации';
    
    return obj.name || obj.vin || obj.serialNumber || `${obj.type} (без названия)`;
  };

  // Получение названия измерительного оборудования по ID
  const getEquipmentName = (equipmentId: string) => {
    const equipment = measurementEquipment.find(eq => eq.id === equipmentId);
    return equipment ? equipment.name : `Оборудование #${equipmentId.substring(0, 8)}`;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, assignmentId: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Проверяем расширение файла
    if (!file.name.toLowerCase().endsWith('.vi2')) {
      alert(`Файл "${file.name}" имеет неподдерживаемый формат. Поддерживаются только файлы .vi2`);
      return;
    }

    // Создаем запись для файла с ID назначения для связи
    const newFile: UploadedFile = {
      id: assignmentId, // Используем ID назначения для связи
      name: file.name,
      uploadDate: new Date().toLocaleString('ru-RU'),
      parsingStatus: 'processing' as const,
      order: uploadedFiles.length,
      contractorId: selectedContractor || undefined,
      qualificationObjectId: selectedQualificationObject || undefined,
      qualificationObjectName: selectedQualificationObject ? getQualificationObjectName(selectedQualificationObject) : undefined,
      contractorName: selectedContractor ? getContractorName(selectedContractor) : undefined
    };

    // Добавляем файл в состояние
    setUploadedFiles(prev => [...prev, newFile]);

    try {
      // Реальный парсинг файла (код из MicroclimatAnalyzer)
      console.log(`Парсинг файла: ${file.name}`);
      
      // Используем универсальный парсер VI2
      const parsingService = new VI2ParsingService();
      const parsedData = await parsingService.parseFile(file);
      
      // Сохраняем в базу данных
      await databaseService.saveParsedFileData(parsedData, assignmentId);
      
      setUploadedFiles(prev => prev.map(f => {
        if (f.id === assignmentId) {
          const period = `${parsedData.startDate.toLocaleDateString('ru-RU')} - ${parsedData.endDate.toLocaleDateString('ru-RU')}`;
          return {
            ...f,
            parsingStatus: 'completed' as const, 
            parsedData,
            recordCount: parsedData.recordCount,
            period
          };
        }
        return f;
      }));
      
    } catch (error) {
      console.error('Ошибка парсинга файла:', error);
      
      // Обновляем статус на ошибку
      setUploadedFiles(prev => prev.map(f => {
        if (f.id === assignmentId) {
          return {
            ...f,
            parsingStatus: 'error' as const,
            errorMessage: error instanceof Error ? error.message : 'Неизвестная ошибка'
          };
        }
        return f;
      }));
    }

    // Очищаем input для возможности загрузки того же файла повторно
    event.target.value = '';
  };

  const handleDeleteFile = async (fileId: string) => {
    if (confirm('Вы уверены, что хотите удалить этот файл?')) {
      setOperationLoading(true);
      try {
        // Удаляем данные из базы
        await databaseService.deleteFileData(fileId);
        
        // Удаляем из базы данных uploaded_files если файл был сохранен
        if (uploadedFileService.isAvailable()) {
          try {
            await uploadedFileService.deleteFile(fileId);
          } catch (error) {
            console.warn('Файл не найден в базе данных или уже удален:', error);
          }
        }
      } catch (error) {
        console.error('Ошибка удаления данных из базы:', error);
      } finally {
        setOperationLoading(false);
      }
      
      // Удаляем из состояния
      setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
    }
  };

  const handleSaveProject = async () => {
    if (!selectedQualificationObject) {
      alert('Выберите объект квалификации для сохранения');
      return;
    }

    if (uploadedFiles.length === 0) {
      alert('Нет файлов для сохранения');
      return;
    }

    // Получаем тип объекта квалификации
    const qualificationObject = qualificationObjects.find(obj => obj.id === selectedQualificationObject);
    if (!qualificationObject) {
      alert('Выбранный объект квалификации не найден');
      return;
    }

    setSaveStatus(prev => ({ ...prev, isSaving: true, error: null }));

    try {
      // Сохраняем все данные в базу данных
      console.log('Сохраняем все данные проекта в базу данных...');
      
      // 1. Сохраняем файлы в базе данных с привязкой к проекту
      if (uploadedFileService.isAvailable()) {
        await uploadedFileService.saveProjectFiles({
          projectId: project.id,
          qualificationObjectId: selectedQualificationObject,
          objectType: qualificationObject.type,
          files: uploadedFiles
        }, user?.id || null);
        console.log('Файлы сохранены в uploaded_files');
      }
      
      // 2. Сохраняем данные измерений в базу данных
      for (const file of uploadedFiles) {
        if (file.parsedData && file.parsingStatus === 'completed') {
          try {
            await databaseService.saveParsedFileData(file.parsedData, file.id);
            console.log(`Данные измерений сохранены для файла: ${file.name}`);
          } catch (error) {
            console.error(`Ошибка сохранения данных измерений для файла ${file.name}:`, error);
          }
        }
      }
      
      // 3. Обновляем статус завершения назначений оборудования
      for (const file of uploadedFiles) {
        if (file.parsingStatus === 'completed' && projectEquipmentService.isAvailable()) {
          try {
            await projectEquipmentService.completeAssignment(file.id);
            console.log(`Назначение оборудования завершено для: ${file.id}`);
          } catch (error) {
            console.error(`Ошибка завершения назначения для ${file.id}:`, error);
          }
        }
      }
      
      // Обновляем статус сохранения
      setSaveStatus({
        isSaving: false,
        lastSaved: new Date(),
        error: null
      });

      console.log('Сохранение данных проекта:', {
        projectId: project.id,
        projectName: project.name,
        qualificationObjectId: selectedQualificationObject,
        objectType: qualificationObject.type,
        filesCount: uploadedFiles.length,
        completedFiles: uploadedFiles.filter(f => f.parsingStatus === 'completed').length
      });

    } catch (error) {
      console.error('Ошибка сохранения данных проекта:', error);
      setSaveStatus({
        isSaving: false,
        lastSaved: null,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    }
  };

  const handleViewData = () => {
    const completedFiles = uploadedFiles.filter(f => f.parsingStatus === 'completed');
    if (completedFiles.length === 0) {
      alert('Нет обработанных файлов для исследования');
      return;
    }
    
    setShowVisualization(true);
  };

  // Если показываем визуализацию, рендерим компонент визуализации в режиме просмотра
  if (showVisualization) {
    return (
      <TimeSeriesAnalyzer 
        files={uploadedFiles.filter(f => f.parsingStatus === 'completed')}
        onBack={() => setShowVisualization(false)}
        viewMode={true}
      />
    );
  }

  const getStatusIcon = (status: UploadedFile['parsingStatus']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-500" />;
      case 'processing':
        return <Loader className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: UploadedFile['parsingStatus']) => {
    switch (status) {
      case 'pending':
        return 'Загрузка';
      case 'processing':
        return 'Обработка';
      case 'completed':
        return 'Обработан';
      case 'error':
        return 'Ошибка обработки';
      default:
        return 'Неизвестно';
    }
  };

  // Получение файла для конкретного назначения оборудования
  const getFileForAssignment = (assignmentId: string): UploadedFile | undefined => {
    return uploadedFiles.find(file => file.id === assignmentId);
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
        <Download className="w-8 h-8 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Выгрузка данных</h1>
          <p className="text-gray-600">{project.name}</p>
        </div>
      </div>

      {/* Информация о проекте */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-2">
          <FolderOpen className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-medium text-blue-900">Информация о проекте</h3>
        </div>
        <div className="text-sm text-blue-800 mb-4">
          <div><strong>Проект:</strong> {project.name}</div>
          <div><strong>Контрагент:</strong> {project.contractorName}</div>
          <div><strong>Статус:</strong> {ProjectStatusLabels[project.status as ProjectStatus]}</div>
          <div><strong>Объектов квалификации:</strong> {project.qualificationObjects.length}</div>
        </div>
        
        {/* Селекторы контрагента и объекта квалификации */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Селектор контрагента */}
          <div className="relative">
            <label className="block text-sm font-medium text-blue-900 mb-1">
              Контрагент (из проекта)
            </label>
            <div className="relative">
              <input
                type="text"
                value={getContractorName(selectedContractor)}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-blue-100 cursor-not-allowed text-blue-800"
                disabled
              />
            </div>
          </div>

          {/* Селектор объекта квалификации */}
          <div className="relative">
            <label className="block text-sm font-medium text-blue-900 mb-1">
              Объект квалификации (из проекта) *
            </label>
            <div className="relative">
              <input
                type="text"
                value={selectedQualificationObject ? getQualificationObjectName(selectedQualificationObject) : qualificationSearch}
                onChange={(e) => {
                  setQualificationSearch(e.target.value);
                  if (!selectedQualificationObject) {
                    setShowQualificationDropdown(true);
                  }
                }}
                onFocus={() => {
                  if (selectedContractor) {
                    setShowQualificationDropdown(true);
                    if (selectedQualificationObject) {
                      setQualificationSearch('');
                      setSelectedQualificationObject('');
                    }
                  }
                }}
                disabled={!selectedContractor}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder={selectedContractor ? 
                  "Объекты квалификации из проекта" : 
                  "Сначала выберите контрагента"
                }
              />
              
              {showQualificationDropdown && selectedContractor && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredQualificationObjects.length > 0 ? (
                    filteredQualificationObjects.map((obj) => (
                      <div
                        key={obj.id}
                        onClick={() => {
                          setSelectedQualificationObject(obj.id);
                          setQualificationSearch('');
                          setShowQualificationDropdown(false);
                          // Сбрасываем загруженные файлы при смене объекта
                          setUploadedFiles([]);
                        }}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">
                          {obj.name || obj.vin || obj.serialNumber || 'Без названия'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {obj.type} {obj.address && `• ${obj.address}`}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-gray-500 text-sm">
                      В проекте нет объектов квалификации
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Секция назначений оборудования */}
      {selectedQualificationObject && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Назначения оборудования</h2>
            <div className="flex space-x-3">
              <button
                onClick={handleSaveProject}
                disabled={saveStatus.isSaving || uploadedFiles.length === 0}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {saveStatus.isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Сохранение...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Сохранить</span>
                  </>
                )}
              </button>
              <button
                onClick={handleViewData}
                disabled={uploadedFiles.filter(f => f.parsingStatus === 'completed').length === 0}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <BarChart className="w-4 h-4" />
                <span>Просмотр данных</span>
              </button>
            </div>
          </div>

          {/* Save Status */}
          <div className="mb-4">
            {saveStatus.lastSaved && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-800">
                    Последнее сохранение: {saveStatus.lastSaved.toLocaleString('ru-RU')}
                  </span>
                </div>
              </div>
            )}
            
            {saveStatus.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-800">
                    Ошибка сохранения: {saveStatus.error}
                  </span>
                </div>
              </div>
            )}
          </div>

          {loadingAssignments ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Загрузка назначений оборудования...</p>
            </div>
          ) : equipmentAssignments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Наименование
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      № зоны измерения
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Уровень измерения (м.)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Файл данных
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {equipmentAssignments.map((assignment) => {
                    const assignedFile = getFileForAssignment(assignment.id);
                    
                    return (
                      <tr key={assignment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {getEquipmentName(assignment.equipmentId)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Назначено: {assignment.assignedAt.toLocaleDateString('ru-RU')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {assignment.zoneNumber === 999 ? 'Внешний' : assignment.zoneNumber}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {assignment.measurementLevel || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {assignedFile ? (
                            <div>
                              <div className="text-sm font-medium text-gray-900">{assignedFile.name}</div>
                              <div className="text-xs text-gray-500">{assignedFile.uploadDate}</div>
                              {assignedFile.period && (
                                <div className="text-xs text-gray-500">{assignedFile.period}</div>
                              )}
                              {assignedFile.recordCount && (
                                <div className="text-xs text-gray-500">
                                  {assignedFile.recordCount.toLocaleString('ru-RU')} записей
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">Файл не загружен</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {assignedFile ? (
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(assignedFile.parsingStatus)}
                              <span className="text-sm text-gray-900">{getStatusText(assignedFile.parsingStatus)}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                          {assignedFile?.errorMessage && (
                            <div className="text-xs text-red-600 mt-1">{assignedFile.errorMessage}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end space-x-2">
                            {!assignedFile ? (
                              <>
                                <input
                                  type="file"
                                  accept=".vi2"
                                  onChange={(e) => handleFileUpload(e, assignment.id)}
                                  className="hidden"
                                  id={`file-upload-${assignment.id}`}
                                />
                                <label
                                  htmlFor={`file-upload-${assignment.id}`}
                                  className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 transition-colors cursor-pointer flex items-center space-x-1"
                                >
                                  <Upload className="w-3 h-3" />
                                  <span>Загрузить файл</span>
                                </label>
                              </>
                            ) : (
                              <button
                                onClick={() => handleDeleteFile(assignedFile.id)}
                                disabled={operationLoading}
                                className="text-red-600 hover:text-red-900 transition-colors"
                                title="Удалить файл"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Назначения оборудования не найдены</p>
              <p className="text-sm">Сначала настройте размещение оборудования на этапе "Начало испытаний"</p>
            </div>
          )}
        </div>
      )}

      {/* Инструкции */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Инструкции по выгрузке данных</h3>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex items-start space-x-2">
            <span className="bg-indigo-100 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
            <p>Выберите объект квалификации из списка объектов проекта</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="bg-indigo-100 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
            <p>Для каждого назначения оборудования загрузите соответствующий файл данных в формате .vi2</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="bg-indigo-100 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
            <p>Убедитесь, что все файлы успешно обработаны (статус "Обработан")</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="bg-indigo-100 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">4</span>
            <p>Сохраните данные в проекте и используйте "Исследовать данные" для анализа</p>
          </div>
        </div>
      </div>
    </div>
  );
};