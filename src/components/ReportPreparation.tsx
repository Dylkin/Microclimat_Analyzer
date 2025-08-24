import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Building2, FolderOpen, Download, AlertCircle, BarChart3, Settings, Zap, Eye, EyeOff, RotateCcw, Save as SaveIcon } from 'lucide-react';
import { Project } from '../types/Project';
import { Contractor } from '../types/Contractor';
import { QualificationObject, QualificationObjectTypeLabels } from '../types/QualificationObject';
import { ProjectDocument, DocumentTypeLabels } from '../types/ProjectDocument';
import { UploadedFile } from '../types/FileData';
import { TimeSeriesPoint, ChartLimits, VerticalMarker, ZoomState, DataType } from '../types/TimeSeriesData';
import { contractorService } from '../utils/contractorService';
import { qualificationObjectService } from '../utils/qualificationObjectService';
import { projectDocumentService } from '../utils/projectDocumentService';
import { uploadedFileService } from '../utils/uploadedFileService';
import { TimeSeriesChart } from './TimeSeriesChart';
import { useTimeSeriesData } from '../hooks/useTimeSeriesData';
import { saveAs } from 'file-saver';
import { DocxTemplateProcessor, TemplateReportData } from '../utils/docxTemplateProcessor';
import { useAuth } from '../contexts/AuthContext';

interface ReportPreparationProps {
  project: Project;
  onBack: () => void;
}

export const ReportPreparation: React.FC<ReportPreparationProps> = ({ project, onBack }) => {
  const { user } = useAuth();
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [qualificationObjects, setQualificationObjects] = useState<QualificationObject[]>([]);
  const [selectedQualificationObject, setSelectedQualificationObject] = useState<string>('');
  const [qualificationSearch, setQualificationSearch] = useState('');
  const [showQualificationDropdown, setShowQualificationDropdown] = useState(false);
  const [additionalDocuments, setAdditionalDocuments] = useState<ProjectDocument[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);

  // Time series analyzer state
  const [dataType, setDataType] = useState<DataType>('temperature');
  const [limits, setLimits] = useState<ChartLimits>({});
  const [markers, setMarkers] = useState<VerticalMarker[]>([]);
  const [zoomState, setZoomState] = useState<ZoomState | undefined>();
  const [showLimitsPanel, setShowLimitsPanel] = useState(false);
  const [showMarkersPanel, setShowMarkersPanel] = useState(false);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [newMarkerLabel, setNewMarkerLabel] = useState('');
  const [editingMarker, setEditingMarker] = useState<string | null>(null);
  const [editMarkerLabel, setEditMarkerLabel] = useState('');
  const [conclusions, setConclusions] = useState('');
  const [researchObject, setResearchObject] = useState('');
  const [conditioningSystem, setConditioningSystem] = useState('');
  const [testType, setTestType] = useState('');
  const [executor, setExecutor] = useState('');
  const [testDate, setTestDate] = useState('');
  const [reportNo, setReportNo] = useState('');
  const [reportDate, setReportDate] = useState('');

  // Load time series data
  const { data: timeSeriesData, loading: dataLoading, error: dataError } = useTimeSeriesData({
    files: uploadedFiles.filter(f => f.parsingStatus === 'completed')
  });

  // Загрузка данных при инициализации
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
    };

    loadData();
  }, [project]);

  // Загрузка дополнительных документов при выборе объекта квалификации
  useEffect(() => {
    const loadAdditionalDocuments = async () => {
      if (!selectedQualificationObject || !projectDocumentService.isAvailable()) {
        setAdditionalDocuments([]);
        return;
      }

      try {
        console.log('Загружаем дополнительные документы для объекта квалификации:', selectedQualificationObject);
        const documents = await projectDocumentService.getProjectDocuments(project.id, selectedQualificationObject);
        
        // Фильтруем только дополнительные документы (схема расстановки и данные испытаний)
        const additionalDocs = documents.filter(doc => 
          doc.documentType === 'layout_scheme' || doc.documentType === 'test_data'
        );
        
        setAdditionalDocuments(additionalDocs);
        console.log('Загружено дополнительных документов:', additionalDocs.length);
      } catch (error) {
        console.error('Ошибка загрузки дополнительных документов:', error);
        setAdditionalDocuments([]);
      }
    };

    loadAdditionalDocuments();
  }, [selectedQualificationObject, project.id]);

  // Загрузка файлов данных при выборе объекта квалификации
  useEffect(() => {
    const loadProjectFiles = async () => {
      if (!selectedQualificationObject) {
        setUploadedFiles([]);
        return;
      }

      try {
        console.log('Загружаем файлы данных для объекта квалификации:', selectedQualificationObject);
        
        // Загружаем назначения оборудования для получения файлов
        const assignments = await projectEquipmentService.getEquipmentPlacement(
          project.id,
          selectedQualificationObject
        );
        
        // Создаем mock-файлы на основе назначений
        const mockFiles: UploadedFile[] = assignments.map((assignment, index) => ({
          id: assignment.id,
          name: `${getEquipmentName(assignment.equipmentId)}.vi2`,
          uploadDate: new Date().toLocaleString('ru-RU'),
          parsingStatus: 'completed' as const,
          order: index,
          zoneNumber: assignment.zoneNumber,
          measurementLevel: assignment.measurementLevel?.toString(),
          parsedData: {
            fileName: `${getEquipmentName(assignment.equipmentId)}.vi2`,
            deviceMetadata: {
              deviceType: 2,
              deviceModel: 'Testo 174H',
              serialNumber: `SN-${assignment.id.substring(0, 8)}`
            },
            measurements: [],
            startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            endDate: new Date(),
            recordCount: 10080,
            parsingStatus: 'completed'
          }
        }));
        
        setUploadedFiles(mockFiles);
        console.log('Mock-файлы созданы:', mockFiles.length);
      } catch (error) {
        console.error('Ошибка загрузки файлов данных:', error);
        setUploadedFiles([]);
      }
        if (projectEquipmentService.isAvailable()) {
          const assignments = await projectEquipmentService.getEquipmentPlacement(
            project.id,
            selectedQualificationObject
          );
          
          // Создаем файлы на основе назначений (заглушка для демонстрации)
          const mockFiles: UploadedFile[] = assignments.map(assignment => ({
            id: assignment.id,
            name: `${getEquipmentName(assignment.equipmentId)}.vi2`,
            uploadDate: assignment.assignedAt.toLocaleString('ru-RU'),
            parsingStatus: assignment.completedAt ? 'completed' : 'pending',
            order: assignment.zoneNumber,
            zoneNumber: assignment.zoneNumber,
            measurementLevel: assignment.measurementLevel.toString(),
            recordCount: assignment.completedAt ? Math.floor(Math.random() * 5000) + 1000 : undefined,
            period: assignment.completedAt ? 
              `${assignment.assignedAt.toLocaleDateString('ru-RU')} - ${assignment.completedAt.toLocaleDateString('ru-RU')}` : 
              undefined
          }));
          
          setUploadedFiles(mockFiles);
          console.log('Загружено файлов данных измерений:', mockFiles.length);
        } else {
          setUploadedFiles([]);
        }
      }
    };

    loadProjectFiles();
  }, [selectedQualificationObject, project.id, user?.id]);

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

  // Получение названия объекта квалификации по ID
  const getQualificationObjectName = (objectId: string) => {
    const obj = qualificationObjects.find(o => o.id === objectId);
    if (!obj) return 'Выберите объект квалификации';
    
    return obj.name || obj.vin || obj.serialNumber || `${obj.type} (без названия)`;
  };

  // Chart dimensions
  const chartWidth = 1200;
  const chartHeight = 600;
  const chartMargin = { top: 40, right: 80, bottom: 80, left: 80 };

  // Handle zoom change
  const handleZoomChange = (newZoomState: ZoomState) => {
    setZoomState(newZoomState);
  };

  // Handle marker addition
  const handleMarkerAdd = (timestamp: number) => {
    const newMarker: VerticalMarker = {
      id: crypto.randomUUID(),
      timestamp,
      label: newMarkerLabel || `Маркер ${markers.length + 1}`,
      color: '#8b5cf6',
      type: 'test'
    };
    setMarkers(prev => [...prev, newMarker]);
    setNewMarkerLabel('');
  };

  // Handle marker edit
  const handleMarkerEdit = (markerId: string, newLabel: string) => {
    setMarkers(prev => prev.map(marker => 
      marker.id === markerId ? { ...marker, label: newLabel } : marker
    ));
    setEditingMarker(null);
    setEditMarkerLabel('');
  };

  // Handle marker delete
  const handleMarkerDelete = (markerId: string) => {
    setMarkers(prev => prev.filter(marker => marker.id !== markerId));
  };

  // Reset zoom
  const handleResetZoom = () => {
    setZoomState(undefined);
  };

  // Update limits
  const updateLimits = (type: DataType, min?: number, max?: number) => {
    setLimits(prev => ({
      ...prev,
      [type]: { min, max }
    }));
  };

  // Calculate analysis results
  const calculateAnalysisResults = () => {
    if (!timeSeriesData) return [];

    const results: any[] = [];
    const fileGroups = new Map<string, TimeSeriesPoint[]>();

    // Group points by file
    timeSeriesData.points.forEach(point => {
      if (!fileGroups.has(point.fileId)) {
        fileGroups.set(point.fileId, []);
      }
      fileGroups.get(point.fileId)!.push(point);
    });

    // Calculate statistics for each file
    fileGroups.forEach((points, fileId) => {
      // Filter points by zoom if applied
      let filteredPoints = points;
      if (zoomState) {
        filteredPoints = points.filter(p => 
          p.timestamp >= zoomState.startTime && p.timestamp <= zoomState.endTime
        );
      }

      if (filteredPoints.length === 0) return;

      const values = filteredPoints
        .map(p => dataType === 'temperature' ? p.temperature : p.humidity)
        .filter(v => v !== undefined) as number[];

      if (values.length === 0) return;

      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      const avgValue = values.reduce((sum, val) => sum + val, 0) / values.length;

      // Check compliance with limits
      let meetsLimits = 'Не установлены';
      if (limits[dataType]) {
        const currentLimits = limits[dataType]!;
        const minOk = currentLimits.min === undefined || minValue >= currentLimits.min;
        const maxOk = currentLimits.max === undefined || maxValue <= currentLimits.max;
        meetsLimits = minOk && maxOk ? 'Да' : 'Нет';
      }

      // Get file info
      const file = uploadedFiles.find(f => f.name === fileId);
      const isExternal = file?.zoneNumber === 999;

      results.push({
        fileId,
        fileName: fileId,
        zoneNumber: isExternal ? 'Внешний' : (file?.zoneNumber || '-'),
        measurementLevel: file?.measurementLevel || '-',
        loggerName: fileId.substring(0, 6),
        serialNumber: file?.parsedData?.deviceMetadata?.serialNumber || '-',
        minTemp: minValue.toFixed(1),
        maxTemp: maxValue.toFixed(1),
        avgTemp: avgValue.toFixed(1),
        meetsLimits,
        isExternal
      });
    });

    return results.sort((a, b) => {
      // External sensors last
      if (a.isExternal && !b.isExternal) return 1;
      if (!a.isExternal && b.isExternal) return -1;
      // Then by zone number
      const aZone = typeof a.zoneNumber === 'number' ? a.zoneNumber : 999;
      const bZone = typeof b.zoneNumber === 'number' ? b.zoneNumber : 999;
      return aZone - bZone;
    });
  };

  // Export data as CSV
  const handleExportCSV = () => {
    if (!timeSeriesData) return;

    let dataToExport = timeSeriesData.points;
    if (zoomState) {
      dataToExport = timeSeriesData.points.filter(p => 
        p.timestamp >= zoomState.startTime && p.timestamp <= zoomState.endTime
      );
    }

    const csvContent = [
      ['Время', 'Файл', 'Зона', 'Уровень', 'Температура (°C)', 'Влажность (%)'].join(','),
      ...dataToExport.map(point => {
        const file = uploadedFiles.find(f => f.name === point.fileId);
        const zoneDisplay = point.zoneNumber === 999 ? 'Внешний' : (point.zoneNumber || '-');
        return [
          new Date(point.timestamp).toLocaleString('ru-RU'),
          point.fileId,
          zoneDisplay,
          file?.measurementLevel || '-',
          point.temperature?.toFixed(1) || '',
          point.humidity?.toFixed(1) || ''
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `microclimate_data_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Generate standard report
  const handleGenerateStandardReport = async () => {
    const results = calculateAnalysisResults();
    if (results.length === 0) {
      alert('Нет данных для создания отчета');
      return;
    }

    try {
      // Create report content
      const reportContent = [
        'ОТЧЕТ ПО АНАЛИЗУ МИКРОКЛИМАТА',
        '',
        `Дата создания: ${new Date().toLocaleDateString('ru-RU')}`,
        `Тип данных: ${dataType === 'temperature' ? 'Температура' : 'Влажность'}`,
        '',
        'РЕЗУЛЬТАТЫ АНАЛИЗА:',
        '',
        'Зона\tУровень\tЛоггер\tСерийный №\tМин.\tМакс.\tСреднее\tСоответствие',
        ...results.map(r => 
          `${r.zoneNumber}\t${r.measurementLevel}\t${r.loggerName}\t${r.serialNumber}\t${r.minTemp}\t${r.maxTemp}\t${r.avgTemp}\t${r.meetsLimits}`
        )
      ].join('\n');

      const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
      saveAs(blob, `microclimate_report_${new Date().toISOString().split('T')[0]}.txt`);
    } catch (error) {
      console.error('Ошибка создания отчета:', error);
      alert('Ошибка создания отчета');
    }
  };

  // Generate report with template
  const handleGenerateTemplateReport = async (templateFile: File) => {
    const results = calculateAnalysisResults();
    if (results.length === 0) {
      alert('Нет данных для создания отчета');
      return;
    }

    try {
      const chartElement = document.getElementById('time-series-chart');
      if (!chartElement) {
        alert('График не найден');
        return;
      }

      const templateData: TemplateReportData = {
        title: 'Анализ микроклимата',
        date: new Date().toLocaleDateString('ru-RU'),
        dataType,
        analysisResults: results,
        conclusions,
        researchObject,
        conditioningSystem,
        testType,
        limits,
        executor,
        testDate,
        reportNo,
        reportDate
      };

      const processor = DocxTemplateProcessor.getInstance();
      const reportBlob = await processor.processTemplate(templateFile, templateData, chartElement);
      
      saveAs(reportBlob, `microclimate_report_${new Date().toISOString().split('T')[0]}.docx`);
    } catch (error) {
      console.error('Ошибка создания отчета по шаблону:', error);
      alert('Ошибка создания отчета по шаблону');
    }
  };

  // Скачивание дополнительного документа
  const handleDownloadAdditionalDocument = async (document: ProjectDocument) => {
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
      console.error('Ошибка скачивания дополнительного документа:', error);
      alert(`Ошибка скачивания документа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Получение документа по типу
  const getAdditionalDocumentByType = (documentType: 'layout_scheme' | 'test_data'): ProjectDocument | null => {
    return additionalDocuments.find(doc => doc.documentType === documentType) || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Загрузка данных отчета...</p>
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
        <FileText className="w-8 h-8 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Подготовка отчета</h1>
          <p className="text-gray-600">{project.name}</p>
        </div>
      </div>

      {/* Информация об объекте */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <FolderOpen className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-medium text-blue-900">Информация об объекте</h3>
        </div>
        
        {/* Информация о проекте */}
        <div className="mb-6">
          <h4 className="text-md font-medium text-blue-900 mb-2">Проект</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
            <div>
              <span className="font-medium">Название:</span>
              <div>{project.name}</div>
            </div>
            <div>
              <span className="font-medium">Дата создания:</span>
              <div>{project.createdAt.toLocaleDateString('ru-RU')}</div>
            </div>
            <div>
              <span className="font-medium">Номер договора:</span>
              <div>{project.contractNumber || 'Не указан'}</div>
            </div>
          </div>
        </div>

        {/* Информация о контрагенте */}
        {contractor && (
          <div className="mb-6">
            <h4 className="text-md font-medium text-blue-900 mb-2">Контрагент</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
              <div>
                <span className="font-medium">Наименование:</span>
                <div>{contractor.name}</div>
              </div>
              <div>
                <span className="font-medium">Адрес:</span>
                <div>{contractor.address || 'Не указан'}</div>
              </div>
            </div>
          </div>
        )}

        {/* Селектор объекта квалификации */}
        <div className="mb-4">
          <h4 className="text-md font-medium text-blue-900 mb-2">Объект квалификации</h4>
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
                setShowQualificationDropdown(true);
                if (selectedQualificationObject) {
                  setQualificationSearch('');
                  setSelectedQualificationObject('');
                }
              }}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Выберите объект квалификации из проекта"
            />
            
            {showQualificationDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredQualificationObjects.length > 0 ? (
                  filteredQualificationObjects.map((obj) => (
                    <div
                      key={obj.id}
                      onClick={() => {
                        setSelectedQualificationObject(obj.id);
                        setQualificationSearch('');
                        setShowQualificationDropdown(false);
                      }}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">
                        {obj.name || obj.vin || obj.serialNumber || 'Без названия'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {QualificationObjectTypeLabels[obj.type]} {obj.address && `• ${obj.address}`}
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

        {/* Детали выбранного объекта квалификации */}
        {selectedQualificationObject && (() => {
          const selectedObj = qualificationObjects.find(obj => obj.id === selectedQualificationObject);
          return selectedObj ? (
            <div className="p-4 bg-white border border-blue-200 rounded-lg">
              <h5 className="text-sm font-medium text-gray-900 mb-2">
                {QualificationObjectTypeLabels[selectedObj.type]}
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                {selectedObj.name && (
                  <div>
                    <span className="font-medium">Наименование:</span>
                    <span className="ml-2">{selectedObj.name}</span>
                  </div>
                )}
                {selectedObj.address && (
                  <div>
                    <span className="font-medium">Адрес:</span>
                    <span className="ml-2">{selectedObj.address}</span>
                  </div>
                )}
                {selectedObj.area && (
                  <div>
                    <span className="font-medium">Площадь:</span>
                    <span className="ml-2">{selectedObj.area} м²</span>
                  </div>
                )}
                {selectedObj.climateSystem && (
                  <div>
                    <span className="font-medium">Климатическая установка:</span>
                    <span className="ml-2">{selectedObj.climateSystem}</span>
                  </div>
                )}
                {selectedObj.vin && (
                  <div>
                    <span className="font-medium">VIN:</span>
                    <span className="ml-2">{selectedObj.vin}</span>
                  </div>
                )}
                {selectedObj.registrationNumber && (
                  <div>
                    <span className="font-medium">Рег. номер:</span>
                    <span className="ml-2">{selectedObj.registrationNumber}</span>
                  </div>
                )}
                {selectedObj.bodyVolume && (
                  <div>
                    <span className="font-medium">Объем кузова:</span>
                    <span className="ml-2">{selectedObj.bodyVolume} м³</span>
                  </div>
                )}
                {selectedObj.inventoryNumber && (
                  <div>
                    <span className="font-medium">Инв. номер:</span>
                    <span className="ml-2">{selectedObj.inventoryNumber}</span>
                  </div>
                )}
                {selectedObj.chamberVolume && (
                  <div>
                    <span className="font-medium">Объем камеры:</span>
                    <span className="ml-2">{selectedObj.chamberVolume} м³</span>
                  </div>
                )}
                {selectedObj.serialNumber && (
                  <div>
                    <span className="font-medium">Серийный номер:</span>
                    <span className="ml-2">{selectedObj.serialNumber}</span>
                  </div>
                )}
              </div>
            </div>
          ) : null;
        })()}
      </div>

      {/* Дополнительные документы */}
      {selectedQualificationObject && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Дополнительные документы</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Схема расстановки */}
            <div>
              <h3 className="text-md font-medium text-gray-800 mb-3">Схема расстановки</h3>
              {(() => {
                const document = getAdditionalDocumentByType('layout_scheme');
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
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownloadAdditionalDocument(document)}
                        disabled={operationLoading}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="Скачать"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg text-center">
                    Схема расстановки не загружена
                  </div>
                );
              })()}
            </div>

            {/* Данные о проведении испытаний */}
            <div>
              <h3 className="text-md font-medium text-gray-800 mb-3">Данные о проведении испытаний</h3>
              {(() => {
                const document = getAdditionalDocumentByType('test_data');
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
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownloadAdditionalDocument(document)}
                        disabled={operationLoading}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="Скачать"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg text-center">
                    Данные о проведении испытаний не загружены
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Time Series Analysis */}
      {selectedQualificationObject && uploadedFiles.filter(f => f.parsingStatus === 'completed').length > 0 && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Анализ временных рядов</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setDataType('temperature')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    dataType === 'temperature'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Температура
                </button>
                <button
                  onClick={() => setDataType('humidity')}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    dataType === 'humidity'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  disabled={!timeSeriesData?.hasHumidity}
                >
                  Влажность
                </button>
                <button
                  onClick={() => setShowLimitsPanel(!showLimitsPanel)}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors flex items-center space-x-2"
                >
                  <Settings className="w-4 h-4" />
                  <span>Лимиты</span>
                </button>
                <button
                  onClick={() => setShowMarkersPanel(!showMarkersPanel)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                >
                  <Zap className="w-4 h-4" />
                  <span>Маркеры</span>
                </button>
                <button
                  onClick={() => setShowExportPanel(!showExportPanel)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <SaveIcon className="w-4 h-4" />
                  <span>Экспорт</span>
                </button>
                {zoomState && (
                  <button
                    onClick={handleResetZoom}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Сбросить масштаб</span>
                  </button>
                )}
              </div>
            </div>

            {/* Limits Panel */}
            {showLimitsPanel && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="text-md font-semibold text-yellow-900 mb-3">
                  Установка лимитов для {dataType === 'temperature' ? 'температуры' : 'влажности'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-yellow-800 mb-1">
                      Минимальное значение
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={limits[dataType]?.min || ''}
                      onChange={(e) => updateLimits(dataType, parseFloat(e.target.value) || undefined, limits[dataType]?.max)}
                      className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      placeholder={`Мин. ${dataType === 'temperature' ? '°C' : '%'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-yellow-800 mb-1">
                      Максимальное значение
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={limits[dataType]?.max || ''}
                      onChange={(e) => updateLimits(dataType, limits[dataType]?.min, parseFloat(e.target.value) || undefined)}
                      className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      placeholder={`Макс. ${dataType === 'temperature' ? '°C' : '%'}`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Markers Panel */}
            {showMarkersPanel && (
              <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h3 className="text-md font-semibold text-purple-900 mb-3">Управление маркерами</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-purple-800 mb-1">
                      Название нового маркера
                    </label>
                    <input
                      type="text"
                      value={newMarkerLabel}
                      onChange={(e) => setNewMarkerLabel(e.target.value)}
                      className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Введите название маркера (необязательно)"
                    />
                    <p className="text-xs text-purple-600 mt-1">
                      Сделайте двойной клик по графику для добавления маркера
                    </p>
                  </div>
                  
                  {markers.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-purple-800 mb-2">Существующие маркеры:</h4>
                      <div className="space-y-2">
                        {markers.map(marker => (
                          <div key={marker.id} className="flex items-center justify-between bg-white p-2 rounded border border-purple-200">
                            {editingMarker === marker.id ? (
                              <div className="flex items-center space-x-2 flex-1">
                                <input
                                  type="text"
                                  value={editMarkerLabel}
                                  onChange={(e) => setEditMarkerLabel(e.target.value)}
                                  className="flex-1 px-2 py-1 border border-purple-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                />
                                <button
                                  onClick={() => handleMarkerEdit(marker.id, editMarkerLabel)}
                                  className="text-green-600 hover:text-green-800"
                                >
                                  <SaveIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingMarker(null);
                                    setEditMarkerLabel('');
                                  }}
                                  className="text-gray-600 hover:text-gray-800"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center space-x-2">
                                  <div 
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: marker.color }}
                                  ></div>
                                  <span className="text-sm text-gray-700">
                                    {marker.label} - {new Date(marker.timestamp).toLocaleString('ru-RU')}
                                  </span>
                                </div>
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() => {
                                      setEditingMarker(marker.id);
                                      setEditMarkerLabel(marker.label || '');
                                    }}
                                    className="text-purple-600 hover:text-purple-800"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={() => handleMarkerDelete(marker.id)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Export Panel */}
            {showExportPanel && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-md font-semibold text-green-900 mb-3">Экспорт данных и отчетов</h3>
                
                {/* Report Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-green-800 mb-1">Объект исследования</label>
                    <input
                      type="text"
                      value={researchObject}
                      onChange={(e) => setResearchObject(e.target.value)}
                      className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Введите объект исследования"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-green-800 mb-1">Климатическая установка</label>
                    <input
                      type="text"
                      value={conditioningSystem}
                      onChange={(e) => setConditioningSystem(e.target.value)}
                      className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Введите тип климатической установки"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-green-800 mb-1">Тип испытания</label>
                    <input
                      type="text"
                      value={testType}
                      onChange={(e) => setTestType(e.target.value)}
                      className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Введите тип испытания"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-green-800 mb-1">Исполнитель</label>
                    <input
                      type="text"
                      value={executor}
                      onChange={(e) => setExecutor(e.target.value)}
                      className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Введите исполнителя"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-green-800 mb-1">Дата испытания</label>
                    <input
                      type="date"
                      value={testDate}
                      onChange={(e) => setTestDate(e.target.value)}
                      className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-green-800 mb-1">Номер договора</label>
                    <input
                      type="text"
                      value={reportNo}
                      onChange={(e) => setReportNo(e.target.value)}
                      className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Введите номер договора"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-green-800 mb-1">Выводы</label>
                  <textarea
                    value={conclusions}
                    onChange={(e) => setConclusions(e.target.value)}
                    className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    rows={3}
                    placeholder="Введите выводы по результатам анализа"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleExportCSV}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Экспорт CSV
                  </button>
                  <button
                    onClick={handleGenerateStandardReport}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Стандартный отчет
                  </button>
                  <div>
                    <input
                      type="file"
                      accept=".docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleGenerateTemplateReport(file);
                        }
                      }}
                      className="hidden"
                      id="template-upload"
                    />
                    <label
                      htmlFor="template-upload"
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors cursor-pointer inline-block"
                    >
                      Отчет по шаблону
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chart */}
          {timeSeriesData && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  График {dataType === 'temperature' ? 'температуры' : 'влажности'}
                </h3>
                <div className="text-sm text-gray-600">
                  {zoomState ? 'Увеличенный масштаб' : 'Полный масштаб'} • 
                  Точек данных: {timeSeriesData.points.filter(p => 
                    zoomState ? (p.timestamp >= zoomState.startTime && p.timestamp <= zoomState.endTime) : true
                  ).length.toLocaleString('ru-RU')}
                </div>
              </div>
              
              {dataLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Загрузка данных...</p>
                  </div>
                </div>
              ) : dataError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600">Ошибка загрузки данных: {dataError}</p>
                </div>
              ) : (
                <div id="time-series-chart">
                  <TimeSeriesChart
                    data={timeSeriesData.points}
                    width={chartWidth}
                    height={chartHeight}
                    margin={chartMargin}
                    dataType={dataType}
                    limits={limits}
                    markers={markers}
                    zoomState={zoomState}
                    onZoomChange={handleZoomChange}
                    onMarkerAdd={handleMarkerAdd}
                    yAxisLabel={dataType === 'temperature' ? 'Температура (°C)' : 'Влажность (%)'}
                  />
                </div>
              )}
            </div>
          )}

          {/* Analysis Results Table */}
          {timeSeriesData && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Результаты анализа</h3>
              
              {(() => {
                const results = calculateAnalysisResults();
                return results.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            № зоны
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Уровень (м.)
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Логгер
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Серийный №
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Мин. {dataType === 'temperature' ? '°C' : '%'}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Макс. {dataType === 'temperature' ? '°C' : '%'}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Среднее {dataType === 'temperature' ? '°C' : '%'}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Соответствие лимитам
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {results.map((result, index) => (
                          <tr key={index} className={result.isExternal ? 'bg-gray-50' : 'hover:bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {result.zoneNumber}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {result.measurementLevel}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {result.loggerName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                              {result.serialNumber}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {result.minTemp}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {result.maxTemp}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {result.avgTemp}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                result.meetsLimits === 'Да' ? 'bg-green-100 text-green-800' :
                                result.meetsLimits === 'Нет' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {result.meetsLimits}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Нет данных для анализа</p>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Инструкции */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Инструкции по подготовке отчета</h3>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex items-start space-x-2">
            <span className="bg-indigo-100 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
            <p>Выберите объект квалификации для анализа данных</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="bg-indigo-100 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
            <p>Проанализируйте данные измерений с помощью интерактивного графика</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="bg-indigo-100 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
            <p>Установите лимиты и добавьте маркеры для детального анализа</p>
          </div>
          <div className="flex items-start space-x-2">
            <span className="bg-indigo-100 text-indigo-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">4</span>
            <p>Заполните поля отчета и экспортируйте результаты в нужном формате</p>
          </div>
        </div>
      </div>
    </div>
  );
};