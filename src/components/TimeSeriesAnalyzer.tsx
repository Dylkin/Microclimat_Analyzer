import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Settings, Plus, Trash2, Edit2, Save, X, BarChart, Thermometer, Droplets, Download, FileText, ExternalLink, XCircle, CheckCircle, ChevronDown, ChevronUp, ArrowUp, ArrowDown } from 'lucide-react';
import { UploadedFile } from '../types/FileData';
import { StorageZone, QualificationObjectTypeLabels } from '../types/QualificationObject';
import { TimeSeriesChart } from './TimeSeriesChart';
import { useTimeSeriesData } from '../hooks/useTimeSeriesData';
import { ChartLimits, VerticalMarker, ZoomState, DataType, MarkerType, TimeSeriesPoint } from '../types/TimeSeriesData';
import { useAuth } from '../contexts/AuthContext';
import html2canvas from 'html2canvas';
import { DocxTemplateProcessor, TemplateReportData } from '../utils/docxTemplateProcessor';
import { reportService, ReportData } from '../utils/reportService';
import { qualificationObjectService } from '../utils/qualificationObjectService';
import { qualificationObjectTypeService } from '../utils/qualificationObjectTypeService';
import { equipmentService } from '../utils/equipmentService';
import { qualificationWorkScheduleService } from '../utils/qualificationWorkScheduleService';
import { loggerDataService } from '../utils/loggerDataService';
import PizZip from 'pizzip';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';

interface TimeSeriesAnalyzerProps {
  files: UploadedFile[];
  onBack?: () => void;
  qualificationObjectId?: string;
  projectId?: string;
  storageZones?: StorageZone[];
}

export const TimeSeriesAnalyzer: React.FC<TimeSeriesAnalyzerProps> = ({ files, onBack, qualificationObjectId, projectId, storageZones }) => {
  const { user, users } = useAuth();
  const restrictedDebugRoles = new Set([
    'specialist',
    'director',
    'manager',
    'специалист',
    'руководитель',
    'менеджер'
  ]);
  const canViewDebugInfo = !restrictedDebugRoles.has((user?.role || '').toLowerCase());

  // Отладочная информация (убрана для продакшена)
  // console.log('TimeSeriesAnalyzer: props:', { files, qualificationObjectId, projectId });
  // console.log('TimeSeriesAnalyzer: data:', data);
  // console.log('TimeSeriesAnalyzer: loading:', loading);
  // console.log('TimeSeriesAnalyzer: error:', error);
  
  // Chart settings
  const [dataType, setDataType] = useState<DataType>('temperature');
  const [limits, setLimits] = useState<ChartLimits>({});
  const [markers, setMarkers] = useState<VerticalMarker[]>([]);
  const [zoomState, setZoomState] = useState<ZoomState | undefined>();
  const [legendResetKey, setLegendResetKey] = useState(0);
  const [hiddenLoggers, setHiddenLoggers] = useState<Set<string>>(new Set());

  const handleHiddenLoggersChange = useCallback((newHiddenLoggers: Set<string>) => {
    setHiddenLoggers(newHiddenLoggers);
  }, []);
  
  // Contract fields
  const [contractFields, setContractFields] = useState({
    testType: '',
    acceptanceCriterion: '' // Критерий приемлемости (мин.) для temperature_recovery
  });
  const [selectedStorageZoneId, setSelectedStorageZoneId] = useState('');
  
  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [editingMarker, setEditingMarker] = useState<string | null>(null);
  const [editingMarkerTimestamp, setEditingMarkerTimestamp] = useState<string | null>(null);
  const [conclusions, setConclusions] = useState('');
  const [showAnalysisResults, setShowAnalysisResults] = useState(false);
  const [analysisResultsRefreshKey, setAnalysisResultsRefreshKey] = useState(0); // Ключ для принудительного обновления результатов анализа
  const [yOffset, setYOffset] = useState(0); // Смещение данных по оси Y
  const [debugInfoOpen, setDebugInfoOpen] = useState(false); // Состояние аккордеона отладочной информации
  const [reportStatus, setReportStatus] = useState<{
    isGenerating: boolean;
    hasReport: boolean;
    reportUrl: string | null;
    reportFilename: string | null;
    templateFile: File | null;
    templateValidation: { isValid: boolean; errors: string[] } | null;
  }>({
    isGenerating: false,
    hasReport: false,
    reportUrl: null,
    reportFilename: null,
    templateFile: null,
    templateValidation: null
  });

  // Состояние для отчета по испытанию
  const [trialReportStatus, setTrialReportStatus] = useState<{
    hasReport: boolean;
    reportUrl: string | null;
    reportFilename: string | null;
  }>({
    hasReport: false,
    reportUrl: null,
    reportFilename: null
  });

  // Состояние для формирования приложения свидетельства о поверке
  const [verificationReportStatus, setVerificationReportStatus] = useState<{
    isGenerating: boolean;
    hasReport: boolean;
    reportUrl: string | null;
    reportFilename: string | null;
  }>({
    isGenerating: false,
    hasReport: false,
    reportUrl: null,
    reportFilename: null
  });

  // Отладка: логируем изменения состояния шаблона
  useEffect(() => {
    console.log('🔄 Состояние шаблона изменилось:', {
      hasTemplateFile: !!reportStatus.templateFile,
      templateFileName: reportStatus.templateFile?.name,
      templateFileSize: reportStatus.templateFile?.size,
      templateValidation: reportStatus.templateValidation
    });
  }, [reportStatus.templateFile, reportStatus.templateValidation]);

  // Состояние для объекта квалификации с зонами измерения
  const [qualificationObject, setQualificationObject] = useState<any>(null);

  const { data, loading, error } = useTimeSeriesData({ 
    files, 
    qualificationObjectId, 
    projectId,
    measurementZones: qualificationObject?.measurementZones
  });

  const formatExportTimestamp = (timestamp: number) => {
    const formatted = new Date(timestamp).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    return formatted.replace(',', '');
  };

  const formatExportValue = (value: number | null | undefined) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '';
    }
    return value.toFixed(2).replace('.', ',');
  };

  const buildDisplayedPoints = useCallback(() => {
    if (!data?.points?.length) {
      return [];
    }
    let points = data.points.filter(point => {
      const value = dataType === 'temperature' ? point.temperature : point.humidity;
      return value !== undefined;
    });

    if (zoomState) {
      points = points.filter(point => point.timestamp >= zoomState.startTime && point.timestamp <= zoomState.endTime);
    }

    return points.map(point => {
      const value = dataType === 'temperature' ? point.temperature : point.humidity;
      const adjustedValue =
        value !== undefined
          ? dataType === 'temperature'
            ? value + yOffset
            : value + yOffset
          : undefined;

      return {
        timestamp: point.timestamp,
        loggerName: point.loggerName || '',
        fileId: point.fileId,
        value: formatExportValue(adjustedValue ?? null)
      };
    });
  }, [data, dataType, yOffset, zoomState]);

  const buildFileSafeName = (value: string) => {
    const cleaned = value
      .replace(/[\\/:*?"<>|]+/g, '_')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned.length > 0 ? cleaned : 'logger';
  };

  const handleInvestigate = useCallback(() => {
    const points = buildDisplayedPoints();
    if (points.length === 0) {
      alert('Нет данных для выгрузки.');
      return;
    }

    const valueLabel = dataType === 'temperature' ? 'Температура[°C]' : 'Влажность[%]';
    const grouped = new Map<string, { name: string; rows: Array<{ 'Дата/время': string; [key: string]: string }> }>();

    points.forEach(point => {
      const loggerLabel = point.loggerName || point.fileId;
      const key = loggerLabel || point.fileId;
      if (!grouped.has(key)) {
        grouped.set(key, { name: loggerLabel || point.fileId, rows: [] });
      }
      grouped.get(key)!.rows.push({
        'Дата/время': formatExportTimestamp(point.timestamp),
        [valueLabel]: point.value
      });
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    grouped.forEach(({ name, rows }) => {
      const sheet = XLSX.utils.json_to_sheet(rows, {
        header: ['Дата/время', valueLabel]
      });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, 'GraphData');
      const safeName = buildFileSafeName(name);
      const fileName = `graph-data-${safeName}-${dataType}-${timestamp}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    });
  }, [buildDisplayedPoints, dataType]);

  // Состояние для Map оборудования (имя -> serial_number)
  const [equipmentMap, setEquipmentMap] = useState<Map<string, string>>(new Map());
  
  // Состояние для отладочной информации
  const [debugInfo, setDebugInfo] = useState<{
    fullProject: string;
    contractor: string;
    loggerCount: number;
    measurementZones: number;
  }>({
    fullProject: 'Не загружен',
    contractor: 'Не загружен',
    loggerCount: 0,
    measurementZones: 0
  });

  // Состояние для шаблона из справочника
  const [templateFromDirectory, setTemplateFromDirectory] = useState<{
    url: string;
    filename: string;
    loaded: boolean;
    loading: boolean;
    error: string | null;
  }>({
    url: '',
    filename: '',
    loaded: false,
    loading: false,
    error: null
  });

  // Состояние для сохраненных отчетов
  const [savedReports, setSavedReports] = useState<ReportData[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  
  // Chart dimensions
  const chartWidth = 1400;
  const chartHeight = 600;
  const chartMargin = { top: 50, right: 20, bottom: 80, left: 60 };

  // Ref для элемента графика
  const chartRef = useRef<HTMLDivElement>(null);

  // Загрузка сохраненных отчетов
  const loadSavedReports = async () => {
    if (!reportService.isAvailable() || !projectId || !qualificationObjectId) {
      console.warn('Недостаточно данных для загрузки отчетов:', { projectId, qualificationObjectId });
      return;
    }

    setLoadingReports(true);
    try {
      const reports = await reportService.getReportsByProjectAndObject(projectId, qualificationObjectId);
      setSavedReports(reports);
      console.log('Загружено сохраненных отчетов:', reports.length);
    } catch (error) {
      console.error('Ошибка загрузки сохраненных отчетов:', error);
    } finally {
      setLoadingReports(false);
    }
  };

  // Загружаем отчет по испытанию
  const loadTrialReport = async () => {
    if (!projectId || !qualificationObjectId) return;
    
    try {
      const dataTypeLabel = dataType === 'temperature' ? 'температура' : 'влажность';
      const trialReportName = `Отчет по испытанию ${dataTypeLabel}`;
      const trialReport = await reportService.findExistingReport(projectId, qualificationObjectId, trialReportName);
      
      if (trialReport) {
        setTrialReportStatus({
          hasReport: true,
          reportUrl: trialReport.reportUrl,
          reportFilename: trialReport.reportFilename
        });
        console.log('Отчет по испытанию загружен:', trialReport.reportName);
      } else {
        setTrialReportStatus({
          hasReport: false,
          reportUrl: null,
          reportFilename: null
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки отчета по испытанию:', error);
    }
  };

  // Загружаем отчеты при инициализации
  useEffect(() => {
    if (projectId && qualificationObjectId) {
      loadSavedReports();
      loadTrialReport();
    }
  }, [projectId, qualificationObjectId, dataType]);

  // Загрузка объекта квалификации с зонами измерения
  useEffect(() => {
    const loadQualificationObject = async () => {
      if (!qualificationObjectId) {
        return;
      }

      try {
        const obj = await qualificationObjectService.getQualificationObjectById(qualificationObjectId, projectId);
        console.log('Загружен объект квалификации с зонами:', obj);
        setQualificationObject(obj);
        
        // Обновляем отладочную информацию
        setDebugInfo(prev => ({
          ...prev,
          measurementZones: obj?.measurementZones?.length || 0
        }));
      } catch (error) {
        console.error('Ошибка загрузки объекта квалификации:', error);
      }
    };

    loadQualificationObject();
  }, [qualificationObjectId]);
  
  // Загрузка информации о проекте и подрядчике для отладки
  useEffect(() => {
    const loadProjectInfo = async () => {
      if (!projectId) {
        setDebugInfo(prev => ({
          ...prev,
          fullProject: 'Не указан',
          contractor: 'Не указан'
        }));
        return;
      }

      try {
        const { projectService } = await import('../utils/projectService');
        const fullProject = await projectService.getProjectById(projectId);
        setDebugInfo(prev => ({
          ...prev,
          fullProject: 'Загружен',
          contractor: fullProject.contractorName || 'Не указан'
        }));
      } catch (error) {
        console.error('Ошибка загрузки проекта:', error);
        setDebugInfo(prev => ({
          ...prev,
          fullProject: 'Ошибка загрузки',
          contractor: 'Ошибка загрузки'
        }));
      }
    };

    loadProjectInfo();
  }, [projectId]);
  
  // Подсчет количества логгеров из данных
  useEffect(() => {
    if (data && data.points) {
      const uniqueLoggers = new Set(data.points.map(p => p.fileId));
      setDebugInfo(prev => ({
        ...prev,
        loggerCount: uniqueLoggers.size
      }));
    }
  }, [data]);

  // Загрузка оборудования при монтировании компонента
  useEffect(() => {
    const loadEquipment = async () => {
      try {
        if (equipmentService.isAvailable()) {
          console.log('Загрузка оборудования для получения серийных номеров...');
          const result = await equipmentService.getAllEquipment(1, 1000);
          const map = new Map<string, string>();
          result.equipment.forEach((eq: any) => {
            if (eq.name && eq.serialNumber) {
              map.set(eq.name, eq.serialNumber);
              console.log(`Добавлено оборудование в Map: ${eq.name} -> ${eq.serialNumber}`);
            }
          });
          setEquipmentMap(map);
          console.log(`Загружено оборудования: ${map.size} записей`);
        } else {
          console.warn('EquipmentService недоступен');
        }
      } catch (error) {
        console.error('Ошибка загрузки оборудования:', error);
      }
    };

    loadEquipment();
  }, []);

  // Загрузка шаблона из справочника объектов квалификации
  useEffect(() => {
    const loadTemplateFromDirectory = async () => {
      if (!qualificationObjectId) {
        return;
      }

      setTemplateFromDirectory(prev => ({ ...prev, loading: true, error: null }));

      try {
        // 1. Загружаем объект квалификации
        const qualificationObject = await qualificationObjectService.getQualificationObjectById(qualificationObjectId, projectId);
        console.log('Загружен объект квалификации:', qualificationObject);

        // 2. Получаем тип объекта квалификации из справочника
        const objectType = qualificationObject.type;
        if (!objectType) {
          throw new Error('Тип объекта квалификации не указан');
        }

        // 3. Находим тип объекта квалификации в справочнике
        const objectTypeInfo = await qualificationObjectTypeService.getTypeByKey(objectType);
        console.log('Найден тип объекта квалификации в справочнике:', objectTypeInfo);

        // 4. Проверяем наличие шаблона отчета
        if (!objectTypeInfo.report_template_url) {
          setTemplateFromDirectory(prev => ({
            ...prev,
            loading: false,
            error: 'Шаблон отчета не загружен в справочник для данного типа объекта квалификации'
          }));
          return;
        }

        // 5. Загружаем шаблон отчета
        const templateUrl = objectTypeInfo.report_template_url;
        const templateFilename = objectTypeInfo.report_template_filename || 'template.docx';
        
        console.log('Загрузка шаблона из:', templateUrl);
        
        // Загружаем файл
        const response = await fetch(templateUrl);
        if (!response.ok) {
          throw new Error(`Ошибка загрузки шаблона: ${response.statusText}`);
        }

        // Проверяем, что ответ содержит бинарные данные
        const contentType = response.headers.get('content-type');
        if (contentType && !contentType.includes('application') && !contentType.includes('octet-stream')) {
          console.warn('⚠️ Неожиданный Content-Type при загрузке шаблона:', contentType);
        }

        const arrayBuffer = await response.arrayBuffer();
        
        // Проверяем, что файл не пустой
        if (arrayBuffer.byteLength === 0) {
          throw new Error('Загруженный файл пуст');
        }

        // Проверяем минимальный размер (DOCX должен быть ZIP архивом)
        if (arrayBuffer.byteLength < 22) {
          throw new Error('Загруженный файл слишком мал для DOCX документа');
        }

        // Проверяем сигнатуру ZIP (DOCX файлы начинаются с PK)
        const uint8Array = new Uint8Array(arrayBuffer.slice(0, 4));
        const signature = String.fromCharCode(...uint8Array);
        if (!signature.startsWith('PK')) {
          console.warn('⚠️ Файл не начинается с ZIP сигнатуры (PK), возможно поврежден');
        }

        const blob = new Blob([arrayBuffer], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        const file = new File([blob], templateFilename, {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          lastModified: Date.now()
        });

        // Устанавливаем шаблон в состояние
        setReportStatus(prev => ({
          ...prev,
          templateFile: file,
          templateValidation: null
        }));

        // Валидируем шаблон
        validateTemplate(file);

        setTemplateFromDirectory({
          url: templateUrl,
          filename: templateFilename,
          loaded: true,
          loading: false,
          error: null
        });

        console.log('Шаблон успешно загружен из справочника:', templateFilename);
      } catch (error) {
        console.error('Ошибка загрузки шаблона из справочника:', error);
        setTemplateFromDirectory(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Неизвестная ошибка'
        }));
      }
    };

    loadTemplateFromDirectory();
  }, [qualificationObjectId]);


  // Функция для поиска наименования логгера по зоне и уровню измерения
  const getLoggerNameForZoneAndLevel = useCallback((zoneNumber: number, measurementLevel: number | string): string | null => {
    if (!qualificationObject?.measurementZones) {
      return null;
    }

    // Нормализуем measurementLevel к числу
    const normalizedLevel = typeof measurementLevel === 'string' ? parseFloat(measurementLevel) : measurementLevel;
    
    // Ищем зону с нужным номером
    const zone = qualificationObject.measurementZones.find((z: any) => z.zoneNumber === zoneNumber);
    if (!zone) {
      return null;
    }

    // Ищем уровень измерения с нужным значением level
    const level = zone.measurementLevels.find((l: any) => {
      const levelValue = typeof l.level === 'string' ? parseFloat(l.level) : l.level;
      // Сравниваем с небольшой погрешностью для чисел с плавающей точкой
      return Math.abs(levelValue - normalizedLevel) < 0.01;
    });

    // Возвращаем equipmentName, если он есть
    return level?.equipmentName || null;
  }, [qualificationObject]);

  // Функция для получения серийного номера из measurement_equipment по equipmentName
  const getSerialNumberByEquipmentName = useCallback((equipmentName: string | null): string | null => {
    if (!equipmentName) {
      return null;
    }
    return equipmentMap.get(equipmentName) || null;
  }, [equipmentMap]);

  // Generate analysis results table data
  const analysisResults = useMemo(() => {
    // Отладочная информация (убрана для продакшена)
    // console.log('TimeSeriesAnalyzer: analysisResults useMemo called', { 
    //   hasData: !!data, 
    //   pointsLength: data?.points?.length || 0,
    //   filesLength: files.length,
    //   qualificationObjectId,
    //   projectId,
    //   hasQualificationObject: !!qualificationObject,
    //   measurementZonesCount: qualificationObject?.measurementZones?.length || 0,
    //   testType: contractFields.testType,
    //   markersCount: markers.length
    // });
    
    if (!data || !data.points.length) {
      // Отладочная информация (убрана для продакшена)
      // console.log('TimeSeriesAnalyzer: No data or points, returning empty array');
      return [];
    }

    // Фильтруем данные по времени если применен зум
    let filteredPoints = data.points;
    if (zoomState) {
      filteredPoints = data.points.filter(point => 
        point.timestamp >= zoomState.startTime && point.timestamp <= zoomState.endTime
      );
    }

    // Для всех типов испытаний фильтруем данные по маркерам типа "Начало испытания" и "Завершение испытания"
    // Находим все маркеры типа "test_start" и "test_end"
    const startMarkers = markers
      .filter(m => m.type === 'test_start')
      .sort((a, b) => a.timestamp - b.timestamp);
    const endMarkers = markers
      .filter(m => m.type === 'test_end')
      .sort((a, b) => a.timestamp - b.timestamp);
    
    // Если есть маркеры начала и завершения, ограничиваем данные
    if (startMarkers.length > 0 && endMarkers.length > 0) {
      // Формируем диапазоны из пар маркеров
      const ranges: Array<{ start: number; end: number }> = [];
      
      // Для каждого "Начало испытания" ищем ближайшее "Завершение испытания" после него
      for (const startMarker of startMarkers) {
        // Ищем первое "Завершение испытания" после "Начало испытания"
        const endMarker = endMarkers.find(e => e.timestamp >= startMarker.timestamp);
        
        if (endMarker) {
          ranges.push({
            start: startMarker.timestamp,
            end: endMarker.timestamp
          });
        }
      }
      
      if (ranges.length > 0) {
        // Для типа loaded_volume исключаем данные между "Открытие двери" и "Восстановление температуры"
        if (contractFields.testType === 'loaded_volume') {
          // Находим маркеры "Открытие двери" и "Восстановление температуры"
          const doorMarkers = markers
            .filter(m => m.type === 'door_opening')
            .sort((a, b) => a.timestamp - b.timestamp);
          const recoveryMarkers = markers
            .filter(m => m.type === 'temperature_recovery')
            .sort((a, b) => a.timestamp - b.timestamp);
          
          // Фильтруем точки, которые попадают в любой из диапазонов
          // и не попадают в диапазоны между "Открытие двери" и "Восстановление температуры"
          filteredPoints = filteredPoints.filter(point => {
            // Проверяем, попадает ли точка в какой-либо диапазон испытания
            const inTestRange = ranges.some(range => 
              point.timestamp >= range.start && point.timestamp <= range.end
            );
            
            if (!inTestRange) {
              return false;
            }
            
            // Если точка в диапазоне испытания, проверяем, не попадает ли она в диапазон 
            // между "Открытие двери" и следующим "Восстановление температуры"
            for (const doorMarker of doorMarkers) {
              // Ищем первое "Восстановление температуры" после "Открытие двери"
              const recoveryMarker = recoveryMarkers.find(r => r.timestamp >= doorMarker.timestamp);
              
              if (recoveryMarker) {
                // Проверяем, что этот диапазон находится внутри диапазона испытания
                const inTestRangeWithDoor = ranges.some(range => 
                  doorMarker.timestamp >= range.start && recoveryMarker.timestamp <= range.end
                );
                
                if (inTestRangeWithDoor) {
                  // Исключаем точку, если она попадает в диапазон между "Открытие двери" и "Восстановление температуры"
                  if (point.timestamp >= doorMarker.timestamp && point.timestamp <= recoveryMarker.timestamp) {
                    return false;
                  }
                }
              }
            }
            
            return true;
          });
        } else if (contractFields.testType === 'empty_volume') {
          // Для empty_volume сохраняем старую логику (исключаем данные между парами "Открытие двери")
          const doorMarkers = markers
            .filter(m => m.type === 'door_opening')
            .sort((a, b) => a.timestamp - b.timestamp);
          
          filteredPoints = filteredPoints.filter(point => {
            const inTestRange = ranges.some(range => 
              point.timestamp >= range.start && point.timestamp <= range.end
            );
            
            if (!inTestRange) {
              return false;
            }
            
            // Исключаем данные между парами маркеров "Открытие двери"
            for (let i = 0; i < doorMarkers.length - 1; i += 2) {
              const doorStart = doorMarkers[i].timestamp;
              const doorEnd = doorMarkers[i + 1]?.timestamp;
              
              if (doorEnd && point.timestamp >= doorStart && point.timestamp <= doorEnd) {
                const inTestRangeWithDoor = ranges.some(range => 
                  doorStart >= range.start && doorEnd <= range.end
                );
                
                if (inTestRangeWithDoor) {
                  return false;
                }
              }
            }
            
            return true;
          });
        } else {
          // Для других типов испытаний просто ограничиваем данными между началом и завершением
          filteredPoints = filteredPoints.filter(point => {
            return ranges.some(range => 
              point.timestamp >= range.start && point.timestamp <= range.end
            );
          });
        }
        
        console.log('TimeSeriesAnalyzer: Filtered by marker ranges', {
          rangesCount: ranges.length,
          filteredCount: filteredPoints.length
        });
      }
    } else if (startMarkers.length > 0) {
      // Если есть только маркеры начала, ограничиваем данные от начала до конца доступных данных
      const earliestStart = Math.min(...startMarkers.map(m => m.timestamp));
      filteredPoints = filteredPoints.filter(point => point.timestamp >= earliestStart);
      console.log('TimeSeriesAnalyzer: Filtered by start markers only', {
        startMarkersCount: startMarkers.length,
        filteredCount: filteredPoints.length
      });
      
      // Для loaded_volume также исключаем данные между "Открытие двери" и "Восстановление температуры"
      if (contractFields.testType === 'loaded_volume') {
        const doorMarkers = markers
          .filter(m => m.type === 'door_opening')
          .sort((a, b) => a.timestamp - b.timestamp);
        const recoveryMarkers = markers
          .filter(m => m.type === 'temperature_recovery')
          .sort((a, b) => a.timestamp - b.timestamp);
        
        filteredPoints = filteredPoints.filter(point => {
          // Проверяем, не попадает ли точка в диапазон между "Открытие двери" и "Восстановление температуры"
          for (const doorMarker of doorMarkers) {
            const recoveryMarker = recoveryMarkers.find(r => r.timestamp >= doorMarker.timestamp);
            
            if (recoveryMarker && point.timestamp >= doorMarker.timestamp && point.timestamp <= recoveryMarker.timestamp) {
              return false; // Исключаем точку
            }
          }
          return true;
        });
      }
    }
    
    // Для loaded_volume, если нет маркеров начала/завершения, но есть зум или данные, 
    // исключаем данные между "Открытие двери" и "Восстановление температуры"
    if (contractFields.testType === 'loaded_volume' && startMarkers.length === 0 && endMarkers.length === 0) {
      const doorMarkers = markers
        .filter(m => m.type === 'door_opening')
        .sort((a, b) => a.timestamp - b.timestamp);
      const recoveryMarkers = markers
        .filter(m => m.type === 'temperature_recovery')
        .sort((a, b) => a.timestamp - b.timestamp);
      
      filteredPoints = filteredPoints.filter(point => {
        // Проверяем, не попадает ли точка в диапазон между "Открытие двери" и "Восстановление температуры"
        for (const doorMarker of doorMarkers) {
          const recoveryMarker = recoveryMarkers.find(r => r.timestamp >= doorMarker.timestamp);
          
          if (recoveryMarker && point.timestamp >= doorMarker.timestamp && point.timestamp <= recoveryMarker.timestamp) {
            return false; // Исключаем точку
          }
        }
        return true;
      });
    }

    // Если есть данные из базы данных (qualificationObjectId и projectId), используем их
    if (qualificationObjectId && projectId) {
      // Отладочная информация (убрана для продакшена)
      // console.log('TimeSeriesAnalyzer: Generating analysis results from database data');
      
      // Группируем точки по zone_number и measurement_level
      const groupedPoints = filteredPoints.reduce((acc, point) => {
        const key = `${point.zoneNumber || 'unknown'}_${point.measurementLevel || 'unknown'}`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(point);
        return acc;
      }, {} as Record<string, typeof filteredPoints>);

      // Отладочная информация (убрана для продакшена)
      // console.log('TimeSeriesAnalyzer: Grouped points:', Object.keys(groupedPoints).length, 'groups');

      return Object.entries(groupedPoints).map(([key, points]) => {
        // Нормализуем zoneNumber: null/undefined -> 0 (зона "Внешний датчик")
        const zoneNumber = points[0]?.zoneNumber !== null && points[0]?.zoneNumber !== undefined 
          ? points[0].zoneNumber 
          : 0;
        
        // Нормализуем measurementLevel: null/undefined -> 'unknown'
        const measurementLevel = points[0]?.measurementLevel !== null && points[0]?.measurementLevel !== undefined
          ? points[0].measurementLevel
          : 'unknown';
        
        // Calculate temperature statistics (с учётом смещения по оси Y из Отладочная информация)
        const temperatures = points
          .filter(p => p.temperature !== undefined && p.temperature !== null && !isNaN(p.temperature) && isFinite(p.temperature))
          .map(p => p.temperature! + yOffset);
        
        // Отладочная информация (убрана для продакшена)
        // console.log(`TimeSeriesAnalyzer: Processing zone ${zoneNumber} level ${measurementLevel}`, {
        //   totalPoints: points.length,
        //   validTemperaturePoints: temperatures.length,
        //   sampleTemps: temperatures.slice(0, 5)
        // });
        
        const humidities = points
          .filter(p => p.humidity !== undefined && p.humidity !== null)
          .map(p => p.humidity! + yOffset);

        let tempStats = { min: '-', max: '-', avg: '-' };
        let humidityStats = { min: '-', max: '-', avg: '-' };
        
        if (temperatures.length > 0) {
          // Используем итеративный подход для больших массивов
          let min = Infinity;
          let max = -Infinity;
          let sum = 0;
          let validCount = 0;
          
          for (const t of temperatures) {
            if (!isNaN(t) && isFinite(t)) {
              if (t < min) min = t;
              if (t > max) max = t;
              sum += t;
              validCount++;
            }
          }
          
          if (validCount > 0) {
            const avg = sum / validCount;
            
            if (isFinite(min) && isFinite(max) && isFinite(avg)) {
              tempStats = {
                min: (Math.round(min * 10) / 10).toString(),
                max: (Math.round(max * 10) / 10).toString(),
                avg: (Math.round(avg * 10) / 10).toString()
              };
            } else {
              console.warn('TimeSeriesAnalyzer: Invalid temperature stats', { min, max, avg, validCount, temperaturesLength: temperatures.length });
            }
          } else {
            console.warn('TimeSeriesAnalyzer: No valid temperature values', { temperaturesLength: temperatures.length, temperatures: temperatures.slice(0, 10) });
          }
        } else {
          console.warn('TimeSeriesAnalyzer: No temperature data for zone', { zoneNumber, measurementLevel, pointsLength: points.length });
        }
        
        if (humidities.length > 0) {
          // Используем итеративный подход для больших массивов
          let min = Infinity;
          let max = -Infinity;
          let sum = 0;
          for (const h of humidities) {
            if (h < min) min = h;
            if (h > max) max = h;
            sum += h;
          }
          const avg = sum / humidities.length;
          
          humidityStats = {
            min: (Math.round(min * 10) / 10).toString(),
            max: (Math.round(max * 10) / 10).toString(),
            avg: (Math.round(avg * 10) / 10).toString()
          };
        }

        // Check if meets limits (исключаем внешние датчики)
        let meetsLimits = '-';
        if (zoneNumber !== 0 && tempStats.min !== '-' && limits.temperature) {
          const minTemp = parseFloat(tempStats.min);
          const maxTemp = parseFloat(tempStats.max);
          const minLimit = limits.temperature.min;
          const maxLimit = limits.temperature.max;
          
          if (minLimit !== undefined && maxLimit !== undefined) {
            meetsLimits = (minTemp >= minLimit && maxTemp <= maxLimit) ? 'Да' : 'Нет';
          }
        }

        // Получаем наименование логгера из объекта квалификации
        const normalizedMeasurementLevel = typeof measurementLevel === 'string' ? parseFloat(measurementLevel) : measurementLevel;
        const equipmentName = getLoggerNameForZoneAndLevel(zoneNumber, normalizedMeasurementLevel);
        
        // Используем equipmentName, если он есть, иначе используем данные из точек
        const loggerName = equipmentName || (points[0] as any)?.loggerName || (points[0] as any)?.deviceModel || 'Unknown';

        // Получаем серийный номер только из measurement_equipment по equipmentName
        const serialNumber = getSerialNumberByEquipmentName(equipmentName) || 'Не указан';
        
        // Логирование для отладки
        if (equipmentName) {
          console.log(`Получение серийного номера для зоны ${zoneNumber}, уровень ${measurementLevel}:`, {
            equipmentName,
            serialNumber,
            equipmentMapSize: equipmentMap.size,
            foundInMap: equipmentMap.has(equipmentName)
          });
        }

        return {
          zoneNumber: zoneNumber === 0 ? 'Внешний' : (zoneNumber !== null && zoneNumber !== undefined ? zoneNumber.toString() : 'Неизвестно'),
          zoneNumberRaw: zoneNumber, // Сохраняем исходный номер для сортировки
          measurementLevel: measurementLevel !== null && measurementLevel !== undefined ? measurementLevel.toString() : 'Неизвестно',
          loggerName: loggerName,
          serialNumber: serialNumber,
          minTemp: tempStats.min,
          maxTemp: tempStats.max,
          avgTemp: tempStats.avg,
          minHumidity: humidityStats.min,
          maxHumidity: humidityStats.max,
          avgHumidity: humidityStats.avg,
          meetsLimits,
          isExternal: zoneNumber === 0,
          fileId: points[0]?.fileId || 'unknown' // Добавляем fileId для фильтрации
        };
      }).sort((a, b) => {
        const parseLevel = (level: any) => {
          const num = parseFloat(level);
          return isNaN(num) ? null : num;
        };

        const aZone = a.zoneNumberRaw ?? 0;
        const bZone = b.zoneNumberRaw ?? 0;
        const aExternal = aZone === 0;
        const bExternal = bZone === 0;

        // Внешние зоны всегда в конце
        if (aExternal && bExternal) return 0;
        if (aExternal) return 1;
        if (bExternal) return -1;

        // Сначала сортируем по зоне
        if (aZone !== bZone) return aZone - bZone;

        // Внутри зоны сортируем по уровню измерения по возрастанию
        const aLevel = parseLevel(a.measurementLevel);
        const bLevel = parseLevel(b.measurementLevel);

        if (aLevel !== null && bLevel !== null && aLevel !== bLevel) return aLevel - bLevel;
        if (aLevel !== null && bLevel === null) return -1;
        if (aLevel === null && bLevel !== null) return 1;
        return 0;
      });
    }

    // Сортируем файлы по порядку (order) для соответствия таблице загрузки файлов
    const sortedFiles = [...files].sort((a, b) => a.order - b.order);
    
    return sortedFiles.map((file) => {
      // Find data points for this file
      const filePoints = filteredPoints.filter(point => point.fileId === file.name);
      
      // Получаем наименование логгера из объекта квалификации для файлов
      const fileZoneNumber = file.zoneNumber || 0;
      const fileMeasurementLevel = file.measurementLevel ? (typeof file.measurementLevel === 'string' ? parseFloat(file.measurementLevel) : file.measurementLevel) : 0;
      const fileEquipmentName = getLoggerNameForZoneAndLevel(fileZoneNumber, fileMeasurementLevel);
      
      if (filePoints.length === 0) {
        // Используем equipmentName, если он есть, иначе используем данные из файла
        const loggerName = fileEquipmentName || file.parsedData?.deviceMetadata?.deviceModel || file.name;
        const equipmentName = fileEquipmentName || file.parsedData?.deviceMetadata?.deviceModel || null;
        const serialNumber = getSerialNumberByEquipmentName(equipmentName) || 'Не указан';
        
        return {
          zoneNumber: file.zoneNumber === 0 ? 'Внешний' : (file.zoneNumber || '-'),
          zoneNumberRaw: file.zoneNumber || 0, // Сохраняем исходный номер для сортировки
          measurementLevel: file.measurementLevel || '-',
          loggerName: loggerName,
          serialNumber: serialNumber,
          minTemp: '-',
          maxTemp: '-',
          avgTemp: '-',
          minHumidity: '-',
          maxHumidity: '-',
          avgHumidity: '-',
          meetsLimits: '-',
          isExternal: file.zoneNumber === 0,
          fileId: file.name // Добавляем fileId для фильтрации
        };
      }

      // Calculate temperature statistics (с учётом смещения по оси Y из Отладочная информация)
      const temperatures = filePoints
        .filter(p => p.temperature !== undefined)
        .map(p => p.temperature! + yOffset);
      
      const humidities = filePoints
        .filter(p => p.humidity !== undefined)
        .map(p => p.humidity! + yOffset);

      let tempStats = { min: '-', max: '-', avg: '-' };
      let humidityStats = { min: '-', max: '-', avg: '-' };
      
      if (temperatures.length > 0) {
        // Используем итеративный подход для больших массивов
        let min = Infinity;
        let max = -Infinity;
        let sum = 0;
        let validCount = 0;
        
        for (const t of temperatures) {
          if (!isNaN(t) && isFinite(t)) {
            if (t < min) min = t;
            if (t > max) max = t;
            sum += t;
            validCount++;
          }
        }
        
        if (validCount > 0) {
          const avg = sum / validCount;
          
          if (isFinite(min) && isFinite(max) && isFinite(avg)) {
            tempStats = {
              min: (Math.round(min * 10) / 10).toString(),
              max: (Math.round(max * 10) / 10).toString(),
              avg: (Math.round(avg * 10) / 10).toString()
            };
          } else {
            console.warn('TimeSeriesAnalyzer: Invalid temperature stats for file', { min, max, avg, validCount, file: file.name });
          }
        } else {
          console.warn('TimeSeriesAnalyzer: No valid temperature values for file', { file: file.name, temperaturesLength: temperatures.length });
        }
      } else {
        console.warn('TimeSeriesAnalyzer: No temperature data for file', { file: file.name, filePointsLength: filePoints.length });
      }
      
      if (humidities.length > 0) {
        // Используем итеративный подход для больших массивов
        let min = Infinity;
        let max = -Infinity;
        let sum = 0;
        for (const h of humidities) {
          if (h < min) min = h;
          if (h > max) max = h;
          sum += h;
        }
        const avg = sum / humidities.length;
        
        humidityStats = {
          min: (Math.round(min * 10) / 10).toString(),
          max: (Math.round(max * 10) / 10).toString(),
          avg: (Math.round(avg * 10) / 10).toString()
        };
      }

      // Check if meets limits
      let meetsLimits = 'Да';
      // Для внешних датчиков не проверяем соответствие лимитам
      if (file.zoneNumber === 0) {
        meetsLimits = '-';
      } else if (limits.temperature && temperatures.length > 0) {
        // Используем итеративный подход для больших массивов
        let min = Infinity;
        let max = -Infinity;
        for (const t of temperatures) {
          if (t < min) min = t;
          if (t > max) max = t;
        }
        
        if (limits.temperature.min !== undefined && min < limits.temperature.min) {
          meetsLimits = 'Нет';
        }
        if (limits.temperature.max !== undefined && max > limits.temperature.max) {
          meetsLimits = 'Нет';
        }
      }

      // Используем equipmentName, если он есть, иначе используем данные из файла
      const fileLoggerName = fileEquipmentName || file.parsedData?.deviceMetadata?.deviceModel || file.name;
      
      return {
          zoneNumber: file.zoneNumber === 0 ? 'Внешний' : (file.zoneNumber || '-'),
        zoneNumberRaw: file.zoneNumber || 0, // Сохраняем исходный номер для сортировки
        measurementLevel: file.measurementLevel || '-',
        loggerName: fileLoggerName, // Наименование логгера из объекта квалификации или из файла
        serialNumber: (() => {
          const equipmentName = fileEquipmentName || file.parsedData?.deviceMetadata?.deviceModel || null;
          const serialNumber = getSerialNumberByEquipmentName(equipmentName) || 'Не указан';
          if (equipmentName) {
            console.log(`Получение серийного номера для файла ${file.name}:`, {
              equipmentName,
              serialNumber,
              equipmentMapSize: equipmentMap.size,
              foundInMap: equipmentMap.has(equipmentName)
            });
          }
          return serialNumber;
        })(),
        minTemp: tempStats.min,
        maxTemp: tempStats.max,
        avgTemp: tempStats.avg,
        minHumidity: humidityStats.min,
        maxHumidity: humidityStats.max,
        avgHumidity: humidityStats.avg,
        meetsLimits,
        isExternal: file.zoneNumber === 0,
        fileId: file.name // Добавляем fileId для фильтрации
      };
    }).sort((a, b) => {
      const parseLevel = (level: any) => {
        const num = parseFloat(level);
        return isNaN(num) ? null : num;
      };

      const aZone = a.zoneNumberRaw ?? 0;
      const bZone = b.zoneNumberRaw ?? 0;
      const aExternal = aZone === 0;
      const bExternal = bZone === 0;

      // Внешние зоны всегда в конце
      if (aExternal && bExternal) return 0;
      if (aExternal) return 1;
      if (bExternal) return -1;

      // Сначала сортируем по зоне
      if (aZone !== bZone) return aZone - bZone;

      // Внутри зоны сортируем по уровню измерения по возрастанию
      const aLevel = parseLevel(a.measurementLevel);
      const bLevel = parseLevel(b.measurementLevel);

      if (aLevel !== null && bLevel !== null && aLevel !== bLevel) return aLevel - bLevel;
      if (aLevel !== null && bLevel === null) return -1;
      if (aLevel === null && bLevel !== null) return 1;
      return 0;
    });
  }, [data, files, limits, zoomState, yOffset, qualificationObjectId, projectId, qualificationObject, getLoggerNameForZoneAndLevel, getSerialNumberByEquipmentName, equipmentMap, contractFields.testType, markers, analysisResultsRefreshKey]); // yOffset — смещение из блока «Отладочная информация»


  // Фильтруем analysisResults по скрытым логгерам
  const visibleAnalysisResults = useMemo(() => {
    const filtered = analysisResults.filter(result => {
      const fileId = (result as any).fileId;
      const isHidden = hiddenLoggers.has(fileId);
      return !isHidden;
    });
    return filtered;
  }, [analysisResults, hiddenLoggers]);

  // Вычисляем глобальные минимальные и максимальные значения (исключая внешние датчики)
  const { globalMinTemp, globalMaxTemp, globalMinHumidity, globalMaxHumidity } = useMemo(() => {
    const nonExternalResults = visibleAnalysisResults.filter(result => !result.isExternal);
    const minTempValues = nonExternalResults
      .map(result => parseFloat(result.minTemp))
      .filter(val => !isNaN(val));
    const maxTempValues = nonExternalResults
      .map(result => parseFloat(result.maxTemp))
      .filter(val => !isNaN(val));
    const minHumidityValues = nonExternalResults
      .map(result => parseFloat((result as any).minHumidity))
      .filter(val => !isNaN(val));
    const maxHumidityValues = nonExternalResults
      .map(result => parseFloat((result as any).maxHumidity))
      .filter(val => !isNaN(val));
    
    let globalMinTemp: number | null = null;
    let globalMaxTemp: number | null = null;
    let globalMinHumidity: number | null = null;
    let globalMaxHumidity: number | null = null;
    
    if (minTempValues.length > 0) {
      let min = Infinity;
      for (const val of minTempValues) {
        if (val < min) min = val;
      }
      globalMinTemp = min === Infinity ? null : min;
    }
    
    if (maxTempValues.length > 0) {
      let max = -Infinity;
      for (const val of maxTempValues) {
        if (val > max) max = val;
      }
      globalMaxTemp = max === -Infinity ? null : max;
    }
    
    if (minHumidityValues.length > 0) {
      let min = Infinity;
      for (const val of minHumidityValues) {
        if (val < min) min = val;
      }
      globalMinHumidity = min === Infinity ? null : min;
    }
    
    if (maxHumidityValues.length > 0) {
      let max = -Infinity;
      for (const val of maxHumidityValues) {
        if (val > max) max = val;
      }
      globalMaxHumidity = max === -Infinity ? null : max;
    }
    
    return {
      globalMinTemp,
      globalMaxTemp,
      globalMinHumidity,
      globalMaxHumidity
    };
  }, [visibleAnalysisResults]);

  // Функция для вычисления времени в формате "час:мин"
  const formatTimeDuration = (milliseconds: number): string => {
    const totalMinutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  // Функция для вычисления времени нахождения в диапазоне после отключения питания (power_off)
  const calculateTimeInRangeAfterPowerOff = (
    points: TimeSeriesPoint[],
    markerTimestamp: number,
    minLimit: number | undefined,
    maxLimit: number | undefined
  ): string => {
    if (!minLimit || !maxLimit || !data) return '-';
    
    // Фильтруем точки после маркера отключения
    const pointsAfterMarker = points
      .filter(p => p.timestamp >= markerTimestamp && p.temperature !== undefined)
      .sort((a, b) => a.timestamp - b.timestamp);
    
    if (pointsAfterMarker.length === 0) return '-';
    
    // Находим первую точку, где температура вышла за пределы лимитов
    let firstOutOfRangeIndex = -1;
    for (let i = 0; i < pointsAfterMarker.length; i++) {
      const temp = pointsAfterMarker[i].temperature!;
      if (temp < minLimit || temp > maxLimit) {
        firstOutOfRangeIndex = i;
        break; // Нашли первую точку выхода за пределы
      }
    }
    
    // Если не нашли точку выхода за пределы, значит все время в диапазоне
    if (firstOutOfRangeIndex === -1) {
      return 'за пределы не выходила';
    }
    
    // Вычисляем время от маркера до момента выхода за пределы
    const timeToOutOfRange = pointsAfterMarker[firstOutOfRangeIndex].timestamp - markerTimestamp;
    return formatTimeDuration(timeToOutOfRange);
  };

  // Функция для вычисления времени восстановления до диапазона после включения питания (power_on)
  const calculateRecoveryTimeAfterPowerOn = (
    points: TimeSeriesPoint[],
    markerTimestamp: number,
    minLimit: number | undefined,
    maxLimit: number | undefined
  ): string => {
    if (!minLimit || !maxLimit || !data) return '-';
    
    // Фильтруем точки после маркера включения и в пределах zoomState (если есть)
    let pointsAfterMarker = points
      .filter(p => 
        p.timestamp >= markerTimestamp && 
        p.temperature !== undefined &&
        (!zoomState || (p.timestamp >= zoomState.startTime && p.timestamp <= zoomState.endTime))
      )
      .sort((a, b) => a.timestamp - b.timestamp);
    
    if (pointsAfterMarker.length === 0) return '-';
    
    // Проверяем, выходила ли температура за пределы лимитов
    let hasExceededLimits = false;
    for (let i = 0; i < pointsAfterMarker.length; i++) {
      const temp = pointsAfterMarker[i].temperature!;
      if (temp < minLimit || temp > maxLimit) {
        hasExceededLimits = true;
        break;
      }
    }
    
    // Если температура не выходила за пределы, возвращаем "за пределы не выходила"
    if (!hasExceededLimits) {
      return 'за пределы не выходила';
    }
    
    // Находим первую точку, где температура входит в диапазон (возвращается к лимитам)
    for (let i = 0; i < pointsAfterMarker.length; i++) {
      const temp = pointsAfterMarker[i].temperature!;
      if (temp >= minLimit && temp <= maxLimit) {
        const recoveryTime = pointsAfterMarker[i].timestamp - markerTimestamp;
        return formatTimeDuration(recoveryTime);
      }
    }
    
    // Если температура выходила за пределы, но не вернулась в диапазон в выделенном периоде
    return '-';
  };

  // Функция для вычисления времени восстановления после открытия двери (temperature_recovery)
  const calculateRecoveryTimeAfterDoorOpening = (
    points: TimeSeriesPoint[],
    doorMarkers: VerticalMarker[],
    minLimit: number | undefined,
    maxLimit: number | undefined
  ): { time: string; meetsCriterion: string } => {
    if (!minLimit || !maxLimit || !data) {
      return { time: '-', meetsCriterion: '-' };
    }
    
    // Фильтруем точки с температурой
    const pointsWithTemp = points
      .filter(p => p.temperature !== undefined)
      .sort((a, b) => a.timestamp - b.timestamp);
    
    if (pointsWithTemp.length === 0) {
      return { time: '-', meetsCriterion: '-' };
    }
    
    // Определяем диапазоны данных между маркерами "Закрытие двери" и "Восстановление температуры"
    let filteredPoints: TimeSeriesPoint[] = [];
    
    if (doorMarkers.length === 0) {
      // Если маркеров нет, используем все данные на графике
      filteredPoints = pointsWithTemp;
    } else {
      // Сортируем маркеры по времени
      const sortedMarkers = [...doorMarkers].sort((a, b) => a.timestamp - b.timestamp);
      const openingMarkers = sortedMarkers.filter(m => m.type === 'door_opening');
      const closingMarkers = sortedMarkers.filter(m => m.type === 'door_closing');
      const recoveryMarkers = sortedMarkers.filter(m => m.type === 'temperature_recovery');
      
      // Если только два маркера: Открытие двери и Закрытие двери (без Восстановление температуры) —
      // используем период от открытия до закрытия двери для проверки выхода за лимиты.
      // Если в этом периоде температура не выходила за пределы — в колонке указываем «за пределы не выходила».
      if (openingMarkers.length > 0 && closingMarkers.length > 0 && recoveryMarkers.length === 0) {
        const tStart = openingMarkers[0].timestamp;
        const tEnd = closingMarkers[closingMarkers.length - 1].timestamp;
        filteredPoints = pointsWithTemp.filter(p => p.timestamp >= tStart && p.timestamp <= tEnd);
      } else if (closingMarkers.length === 0 || recoveryMarkers.length === 0) {
        // Нет пары закрытие/восстановление — используем все данные (резервный вариант)
        filteredPoints = pointsWithTemp;
      } else {
        // Для каждой пары "Закрытие двери" - "Восстановление температуры" используем данные между ними
        for (const closingMarker of closingMarkers) {
          const recoveryMarker = recoveryMarkers.find(m => m.timestamp > closingMarker.timestamp);
          if (recoveryMarker) {
            const rangePoints = pointsWithTemp.filter(p =>
              p.timestamp >= closingMarker.timestamp && p.timestamp <= recoveryMarker.timestamp
            );
            filteredPoints.push(...rangePoints);
          } else {
            const rangePoints = pointsWithTemp.filter(p => p.timestamp >= closingMarker.timestamp);
            filteredPoints.push(...rangePoints);
          }
        }
        filteredPoints = filteredPoints
          .filter((point, index, self) =>
            index === self.findIndex(p => p.timestamp === point.timestamp)
          )
          .sort((a, b) => a.timestamp - b.timestamp);
      }
    }
    
    if (filteredPoints.length === 0) {
      return { time: '-', meetsCriterion: '-' };
    }
    
    // Проверяем, выходили ли данные за пределы лимитов
    let totalTimeOutsideLimits = 0; // Общее время нахождения за пределами в миллисекундах
    let isCurrentlyOutside = false;
    let outsideStartTime: number | null = null;
    
    for (let i = 0; i < filteredPoints.length; i++) {
      const temp = filteredPoints[i].temperature!;
      const isOutside = temp < minLimit || temp > maxLimit;
      
      if (isOutside && !isCurrentlyOutside) {
        // Начало периода нахождения за пределами
        isCurrentlyOutside = true;
        outsideStartTime = filteredPoints[i].timestamp;
      } else if (!isOutside && isCurrentlyOutside && outsideStartTime !== null) {
        // Конец периода нахождения за пределами
        const periodDuration = filteredPoints[i].timestamp - outsideStartTime;
        totalTimeOutsideLimits += periodDuration;
        isCurrentlyOutside = false;
        outsideStartTime = null;
      }
    }
    
    // Если период нахождения за пределами не закончился, учитываем время до последней точки
    if (isCurrentlyOutside && outsideStartTime !== null && filteredPoints.length > 0) {
      const lastPoint = filteredPoints[filteredPoints.length - 1];
      const periodDuration = lastPoint.timestamp - outsideStartTime;
      totalTimeOutsideLimits += periodDuration;
    }
    
    // Если данные не выходили за пределы
    if (totalTimeOutsideLimits === 0) {
      const acceptanceCriterion = contractFields.acceptanceCriterion 
        ? parseInt(contractFields.acceptanceCriterion) 
        : 0;
      // Если не выходили за пределы, считаем, что критерий выполнен
      return { time: 'за пределы не выходила', meetsCriterion: 'Да' };
    }
    
    // Вычисляем время в минутах
    const timeInMinutes = Math.floor(totalTimeOutsideLimits / (1000 * 60));
    
    // Используем критерий приемлемости из contractFields
    const acceptanceCriterion = contractFields.acceptanceCriterion 
      ? parseInt(contractFields.acceptanceCriterion) 
      : 0;
    const meetsCriterion = timeInMinutes <= acceptanceCriterion ? 'Да' : 'Нет';
    
    // Форматируем время в формате "час:мин"
    const timeString = formatTimeDuration(totalTimeOutsideLimits);
    
    return { time: timeString, meetsCriterion };
  };

  // Получаем маркер для текущего типа испытания
  const getTestMarker = (): VerticalMarker | null => {
    if (!contractFields.testType || markers.length === 0) return null;
    
    // Для power_off ищем маркер типа 'power' с наименованием 'Отключение'
    if (contractFields.testType === 'power_off') {
      const powerMarkers = markers.filter(m => m.type === 'power' && m.label === 'Отключение');
      return powerMarkers.length > 0 ? powerMarkers[0] : null;
    }
    
    // Для power_on ищем маркер типа 'power' с наименованием 'Включение'
    if (contractFields.testType === 'power_on') {
      const powerMarkers = markers.filter(m => m.type === 'power' && m.label === 'Включение');
      return powerMarkers.length > 0 ? powerMarkers[0] : null;
    }
    
    // Для temperature_recovery ищем маркер типа 'temperature_recovery'
    if (contractFields.testType === 'temperature_recovery') {
      const recoveryMarkers = markers.filter(m => m.type === 'temperature_recovery');
      return recoveryMarkers.length > 0 ? recoveryMarkers[0] : null;
    }
    
    // Для других типов испытаний ищем маркер типа 'test_start'
    const testStartMarkers = markers.filter(m => m.type === 'test_start');
    return testStartMarkers.length > 0 ? testStartMarkers[0] : null;
  };

  const handleLimitChange = (type: DataType, limitType: 'min' | 'max', value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    setLimits(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [limitType]: numValue
      }
    }));
  };

  const handleAddMarker = useCallback((timestamp: number) => {
    // Для temperature_recovery добавляем маркеры в порядке: Открытие двери -> Закрытие двери -> Восстановление температуры
    if (contractFields.testType === 'temperature_recovery') {
      // Проверяем, какие маркеры уже есть
      const doorOpeningMarkers = markers.filter(m => m.type === 'door_opening');
      const doorClosingMarkers = markers.filter(m => m.type === 'door_closing');
      const recoveryMarkers = markers.filter(m => m.type === 'temperature_recovery');
      
      // Определяем, какой маркер нужно добавить
      let newMarker: VerticalMarker;
      
      // Если нет маркеров "Открытие двери", добавляем его
      if (doorOpeningMarkers.length === 0) {
        newMarker = {
          id: Date.now().toString(),
          timestamp,
          label: 'Открытие двери',
          color: '#000000',
          type: 'door_opening'
        };
      }
      // Если есть "Открытие двери", но нет "Закрытие двери", добавляем "Закрытие двери"
      else if (doorClosingMarkers.length === 0) {
        // Проверяем, что новый маркер идет после последнего "Открытие двери"
        const lastOpeningMarker = doorOpeningMarkers.sort((a, b) => b.timestamp - a.timestamp)[0];
        if (timestamp > lastOpeningMarker.timestamp) {
          newMarker = {
            id: Date.now().toString(),
            timestamp,
            label: 'Закрытие двери',
            color: '#000000',
            type: 'door_closing'
          };
        } else {
          alert('"Закрытие двери" должно быть установлено после "Открытие двери".');
          return;
        }
      }
      // Если есть "Открытие двери" и "Закрытие двери", добавляем "Восстановление температуры"
      else {
        // Проверяем, что новый маркер идет после последнего "Закрытие двери"
        const lastClosingMarker = doorClosingMarkers.sort((a, b) => b.timestamp - a.timestamp)[0];
        if (timestamp > lastClosingMarker.timestamp) {
          // Проверяем, нет ли уже "Восстановление температуры" после этого "Закрытие двери"
          const hasRecoveryAfterClosing = recoveryMarkers.some(m => m.timestamp > lastClosingMarker.timestamp);
          
          if (!hasRecoveryAfterClosing) {
            newMarker = {
              id: Date.now().toString(),
              timestamp,
              label: 'Восстановление температуры',
              color: '#000000',
              type: 'temperature_recovery'
            };
          } else {
            alert('Для данного "Закрытие двери" уже установлено "Восстановление температуры". Создайте новую последовательность маркеров.');
            return;
          }
        } else {
          alert('"Восстановление температуры" должно быть установлено после "Закрытие двери".');
          return;
        }
      }
      
      setMarkers(prev => [...prev, newMarker]);
    } else if (contractFields.testType === 'power_off') {
      // Для power_off создаем маркер типа "power" с наименованием "Отключение"
      const newMarker: VerticalMarker = {
        id: Date.now().toString(),
        timestamp,
        label: 'Отключение',
        color: '#000000', // Черный цвет для всех маркеров
        type: 'power'
      };
      setMarkers(prev => [...prev, newMarker]);
    } else if (contractFields.testType === 'power_on') {
      // Для power_on создаем маркер типа "power" с наименованием "Включение"
      const newMarker: VerticalMarker = {
        id: Date.now().toString(),
        timestamp,
        label: 'Включение',
        color: '#000000', // Черный цвет для всех маркеров
        type: 'power'
      };
      setMarkers(prev => [...prev, newMarker]);
    } else {
      // Для других типов испытаний создаем маркеры "Начало испытания" и "Завершение испытания"
      // Проверяем, есть ли уже маркер "Начало испытания"
      const hasStartMarker = markers.some(m => m.type === 'test_start');
      
      if (!hasStartMarker) {
        // Если нет маркера начала, создаем "Начало испытания"
        const newMarker: VerticalMarker = {
          id: Date.now().toString(),
          timestamp,
          label: 'Начало испытания',
          color: '#000000', // Черный цвет для всех маркеров
          type: 'test_start'
        };
        setMarkers(prev => [...prev, newMarker]);
      } else {
        // Если есть маркер начала, проверяем, можно ли создать "Завершение испытания"
        // Находим последний маркер "Начало испытания"
        const startMarkers = markers
          .filter(m => m.type === 'test_start')
          .sort((a, b) => a.timestamp - b.timestamp);
        const lastStartMarker = startMarkers[startMarkers.length - 1];
        
        // Проверяем, что новый маркер идет после последнего "Начало испытания"
        if (timestamp > lastStartMarker.timestamp) {
          // Проверяем, нет ли уже "Завершение испытания" после этого "Начало испытания"
          const hasEndMarkerAfterStart = markers.some(m => 
            m.type === 'test_end' && m.timestamp > lastStartMarker.timestamp
          );
          
          if (!hasEndMarkerAfterStart) {
            // Создаем "Завершение испытания"
            const newMarker: VerticalMarker = {
              id: Date.now().toString(),
              timestamp,
              label: 'Завершение испытания',
              color: '#000000', // Черный цвет для всех маркеров
              type: 'test_end'
            };
            setMarkers(prev => [...prev, newMarker]);
          } else {
            alert('Для данного "Начало испытания" уже установлено "Завершение испытания". Создайте новое "Начало испытания" перед установкой следующего "Завершение испытания".');
          }
        } else {
          alert('"Завершение испытания" должно быть установлено после "Начало испытания".');
        }
      }
    }
  }, [markers, contractFields.testType]);

  const handleUpdateMarker = (id: string, label: string) => {
    setMarkers(prev => prev.map(m => m.id === id ? { ...m, label } : m));
    setEditingMarker(null);
  };

  const handleUpdateMarkerType = (id: string, type: MarkerType) => {
    // Все маркеры должны быть черного цвета
    const color = '#000000';
    setMarkers(prev => prev.map(m => {
      if (m.id === id) {
        const currentLabel = m.label;
        let label = currentLabel;
        
        // Если тип изменен на "door_opening", устанавливаем соответствующее название
        if (type === 'door_opening') {
          label = currentLabel === 'Восстановление температуры' ? 'Восстановление температуры' : 'Открытие двери';
        }
        // Если тип изменен на "temperature_recovery", устанавливаем название "Восстановление температуры"
        else if (type === 'temperature_recovery') {
          label = 'Восстановление температуры';
        }
        // Если тип изменен на "door_closing", устанавливаем название "Закрытие двери"
        else if (type === 'door_closing') {
          label = 'Закрытие двери';
        }
        // Если тип изменен на "test_start", устанавливаем название "Начало испытания"
        else if (type === 'test_start') {
          label = 'Начало испытания';
        }
        // Если тип изменен на "test_end", устанавливаем название "Завершение испытания"
        else if (type === 'test_end') {
          // Проверяем, что есть маркер "Начало испытания" перед этим маркером
          const marker = prev.find(m => m.id === id);
          if (marker) {
            const hasStartBefore = prev.some(m => 
              m.type === 'test_start' && m.timestamp < marker.timestamp
            );
            if (!hasStartBefore) {
              alert('Нельзя установить "Завершение испытания" без предшествующего "Начало испытания".');
              return m; // Не изменяем тип
            }
          }
          label = 'Завершение испытания';
        }
        // Если тип изменен на "power", устанавливаем соответствующее наименование в зависимости от типа испытания
        else if (type === 'power') {
          if (contractFields.testType === 'power_off') {
            label = 'Отключение';
          } else if (contractFields.testType === 'power_on') {
            label = 'Включение';
          } else {
            label = currentLabel || 'Отключение'; // По умолчанию, если тип испытания не определен
          }
        }
        
        return { ...m, type, color, label };
      }
      return m;
    }));
  };

  const handleUpdateMarkerTimestamp = (id: string, newTimestamp: number) => {
    // Проверяем, что новый timestamp находится в пределах данных
    if (data && data.timeRange && data.timeRange.length === 2) {
      const timeRange = data.timeRange;
      if (newTimestamp < timeRange[0] || newTimestamp > timeRange[1]) {
        alert(`Время маркера должно находиться в пределах данных: ${new Date(timeRange[0]).toLocaleString('ru-RU')} - ${new Date(timeRange[1]).toLocaleString('ru-RU')}`);
        return;
      }
    }
    
    setMarkers(prev => prev.map(m => m.id === id ? { ...m, timestamp: newTimestamp } : m));
    setEditingMarkerTimestamp(null);
  };

  const getMarkerTypeLabel = (type: MarkerType): string => {
    switch (type) {
      case 'test_start':
        return 'Начало испытания';
      case 'test_end':
        return 'Завершение испытания';
      case 'door_opening':
        return 'Открытие двери';
      case 'door_closing':
        return 'Закрытие двери';
      case 'temperature_recovery':
        return 'Восстановление температуры';
      case 'power':
        return 'Электропитание';
      case 'power_off_event':
        return 'Питание выключено';
      case 'power_on_event':
        return 'Питание включено';
      default:
        return 'Неизвестно';
    }
  };

  const handleDeleteMarker = (id: string) => {
    setMarkers(prev => prev.filter(m => m.id !== id));
  };

  const handleResetZoom = () => {
    setZoomState(undefined);
    setLegendResetKey(prev => prev + 1);
  };

  const handleContractFieldChange = (field: keyof typeof contractFields, value: string) => {
    setContractFields(prev => ({
      ...prev,
      [field]: value
    }));
    
    // При смене типа испытания очищаем выводы, скрываем результаты анализа и сбрасываем маркеры
    if (field === 'testType') {
      setConclusions('');
      setShowAnalysisResults(false);
      setMarkers([]); // Сбрасываем все маркеры времени при смене типа испытания
    }
  };

  const handleTemplateUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.docx')) {
      console.log('📄 Загрузка шаблона:', file.name);
      console.log('  - Размер:', file.size, 'байт');
      console.log('  - Тип:', file.type);
      
      // Сразу читаем файл в память, чтобы избежать проблем с доступом позже
      try {
        const arrayBuffer = await file.arrayBuffer();
        console.log('✅ Файл шаблона загружен в память:', arrayBuffer.byteLength, 'байт');
        
        // Создаем новый File объект из ArrayBuffer для надежного хранения
        const clonedFile = new File([arrayBuffer], file.name, { type: file.type });
        
        setReportStatus(prev => ({ 
          ...prev, 
          templateFile: clonedFile,
          templateValidation: null 
        }));
        
        console.log('✅ Шаблон сохранен в состояние:', clonedFile.name);
        
        // Валидируем шаблон
        validateTemplate(clonedFile);
      } catch (error) {
        console.error('❌ Ошибка загрузки файла шаблона:', error);
        alert(`Не удалось загрузить файл шаблона: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      }
    } else {
      alert('Пожалуйста, выберите файл в формате .docx');
    }
  };

  const validateTemplate = async (file: File) => {
    try {
      const processor = DocxTemplateProcessor.getInstance();
      const validation = await processor.validateTemplate(file);
      
      setReportStatus(prev => ({ 
        ...prev, 
        templateValidation: validation 
      }));
      
      console.log('✅ Результат валидации сохранен в состояние:', {
        isValid: validation.isValid,
        errors: validation.errors
      });
      
      if (!validation.isValid) {
        console.warn('Ошибки валидации шаблона:', validation.errors);
      } else {
        console.log('✅ Шаблон успешно валидирован');
      }
    } catch (error) {
      console.error('Ошибка валидации шаблона:', error);
      setReportStatus(prev => ({ 
        ...prev, 
        templateValidation: { 
          isValid: false, 
          errors: ['Ошибка чтения файла шаблона'] 
        } 
      }));
    }
  };
  const handleRemoveTemplate = () => {
    setReportStatus(prev => ({ 
      ...prev, 
      templateFile: null,
      templateValidation: null 
    }));
  };


  const handleGenerateTemplateReport = async () => {
    if (!reportStatus.templateFile || !chartRef.current) {
      alert('Необходимо загрузить шаблон и убедиться, что график отображается');
      return;
    }

    if (reportStatus.templateValidation && !reportStatus.templateValidation.isValid) {
      alert('Шаблон содержит ошибки. Пожалуйста, исправьте их перед генерацией отчета.');
      return;
    }

    setReportStatus(prev => ({ ...prev, isGenerating: true }));

    try {
      // Получаем экземпляр процессора
      const processor = DocxTemplateProcessor.getInstance();
      
      // Если уже есть отчет, устанавливаем его для добавления данных
      if (reportStatus.hasReport && reportStatus.reportUrl) {
        const existingReportResponse = await fetch(reportStatus.reportUrl);
        const existingReportBlob = await existingReportResponse.blob();
        processor.setExistingReport(existingReportBlob);
      } else {
        processor.clearExistingReport();
      }
      
      // Генерируем данные для шаблона
      const now = new Date();
      const dateStr = now.toLocaleDateString('ru-RU');
      
      // Отладка: проверяем формат даты
      console.log('Generated dateStr (только дата):', dateStr);
      const dataTypeLabel = dataType === 'temperature' ? 'температура' : 'влажность';
      
      // Отладка: выводим все поля contractFields
      console.log('Contract fields:', contractFields);
      console.log('Test type value:', contractFields.testType);
     console.log('Current limits:', limits);
     console.log('Current dataType:', dataType);
      
      // Функция для получения читаемого названия типа испытания
      const getTestTypeLabel = (testType: string): string => {
        console.log('Converting test type:', testType);
        switch (testType) {
          case 'empty_volume':
            return 'Испытание на соответствие критериям в пустом объеме';
          case 'loaded_volume':
            return 'Испытание на соответствие критериям в загруженном объеме';
          case 'temperature_recovery':
            return 'Испытание по восстановлению температуры после открытия двери';
          case 'power_off':
            return 'Испытание на сбой электропитания (отключение)';
          case 'power_on':
            return 'Испытание на сбой электропитания (включение)';
          default:
            return testType || '';
        }
      };
      
      const convertedTestType = getTestTypeLabel(contractFields.testType);
      console.log('Converted test type:', convertedTestType);

      const selectedStorageZone = (storageZones || []).find(zone => zone.id === selectedStorageZoneId);
      const selectedStorageZoneName = selectedStorageZone
        ? (selectedStorageZone.name && selectedStorageZone.name.trim().length > 0 ? selectedStorageZone.name : 'Без наименования')
        : '';
      const selectedStorageZoneVolumeLabel = selectedStorageZone && selectedStorageZone.volume !== undefined && selectedStorageZone.volume !== null
        ? ` (${selectedStorageZone.volume}м³)`
        : '';
      const selectedStorageZoneLabel = selectedStorageZoneName
        ? `${selectedStorageZoneName}${selectedStorageZoneVolumeLabel}`
        : '';

      // Для плейсхолдера {Size} — только значение площади (без типа помещения и зон хранения)
      const objectSize =
        qualificationObject?.area !== undefined && qualificationObject?.area !== null
          ? String(qualificationObject.area)
          : '';
      
      const templateData: TemplateReportData = {
        title: `Отчет по анализу временных рядов - ${dataTypeLabel}`,
        date: dateStr, // Только дата без времени
        dataType,
        analysisResults: visibleAnalysisResults,
        conclusions,
        researchObject: qualificationObject?.name || 'Не указан',
        storageZoneName: selectedStorageZoneLabel,
        conditioningSystem: qualificationObject?.climateSystem || '',
       testType: contractFields.testType || '', // Передаем исходный testType (empty_volume, loaded_volume и т.д.) для логики
        testTypeLabel: convertedTestType || '', // Передаем преобразованное название для плейсхолдера {NameTest}
        limits: limits,
        executor: user?.fullName || '',
        position: user ? (users.find(u => u.id === user.id)?.position ?? '') : '', // Должность из справочника пользователей для {Position}
        objectSize, // Площадь, тип помещения, зоны хранения для {Size}
        testDate: (() => {
          console.log('🔍 DEBUG testDate:');
          console.log('  - dateStr:', dateStr);
          console.log('  - dateStr type:', typeof dateStr);
          console.log('  - dateStr length:', dateStr.length);
          return dateStr;
        })(),
        reportNo: '',
        reportDate: '',
        registrationNumber: qualificationObject?.registrationNumber || '',
        serialNumber: qualificationObject?.serialNumber || '',
        inventoryNumber: qualificationObject?.inventoryNumber || '',
        points: data?.points || [], // Передаем точки данных для вычисления дополнительных значений
        markers: markers || [], // Передаем маркеры для вычисления дополнительных значений
        acceptanceCriterion: contractFields.acceptanceCriterion || '', // Передаем критерий приемлемости
        zoomState: zoomState || undefined // Передаем выделенный диапазон данных (если есть)
      };
      
      // Отладочная информация для {Table}
      console.log('TemplateData for {Table}:');
      console.log('- analysisResults count:', analysisResults.length);
      console.log('- analysisResults data:', analysisResults);
      console.log('- dataType:', dataType);

        // Анализируем содержимое шаблона для диагностики плейсхолдеров
        const analysis = await processor.analyzeTemplateContent(reportStatus.templateFile);
        console.log('Template analysis:', analysis);

        if (!analysis.hasTable) {
          console.warn('Шаблон не содержит плейсхолдер {Table}. Таблица результатов не будет вставлена.');
          console.log('Found placeholders in template:', analysis.placeholders);
          console.log('Template content preview:', analysis.content);
          // Можно добавить уведомление пользователю
        } else {
          console.log('Found Table placeholder in template');
        }

      // Обрабатываем шаблон
      const docxBlob = await processor.processTemplate(
        reportStatus.templateFile,
        templateData,
        chartRef.current
      );

      // Освобождаем старый URL если он есть
      if (reportStatus.reportUrl) {
        URL.revokeObjectURL(reportStatus.reportUrl);
      }

      // Создаем URL для скачивания
      let reportUrl = URL.createObjectURL(docxBlob);
      let reportFilename = reportStatus.hasReport 
        ? reportStatus.reportFilename // Сохраняем старое имя файла
        : `отчет_шаблон_${dataTypeLabel}_${now.toISOString().slice(0, 10)}_${now.toTimeString().slice(0, 8).replace(/:/g, '-')}.docx`;

      // Новая логика создания отчетов
      if (reportService.isAvailable() && projectId && qualificationObjectId && user?.id) {
        try {
          // 1. Создаем отчет по испытанию (всегда перезаписывается)
          const trialReportName = `Отчет по испытанию ${dataTypeLabel}`;
          const trialReportFilename = `отчет_шаблон_${dataTypeLabel}_${now.toISOString().slice(0, 10)}.docx`;
          
          // Ищем существующий отчет по испытанию
          const existingTrialReport = await reportService.findExistingReport(projectId, qualificationObjectId, trialReportName);
          
          if (existingTrialReport) {
            console.log('Обновляем отчет по испытанию...');
            // Обновляем существующий отчет по испытанию
            await reportService.updateReport(existingTrialReport.id!, {
              reportUrl,
              reportFilename: trialReportFilename,
              reportData: {
                dataType,
                analysisResults: visibleAnalysisResults,
                contractFields,
                storageZoneName: selectedStorageZoneLabel,
                conclusions,
                markers,
                limits
              }
            });
            
            
            console.log('Отчет по испытанию обновлен');
          } else {
            console.log('Создаем новый отчет по испытанию...');
            // Создаем новый отчет по испытанию
            const trialReportData = {
              projectId,
              qualificationObjectId,
              reportName: trialReportName,
              reportType: 'template' as const,
              reportUrl,
              reportFilename: trialReportFilename,
              reportData: {
                dataType,
                analysisResults: visibleAnalysisResults,
                contractFields,
                storageZoneName: selectedStorageZoneLabel,
                conclusions,
                markers,
                limits
              },
              createdBy: user.id
            };
            const savedTrialReport = await reportService.saveReport(trialReportData);
            console.log('Отчет по испытанию создан');
            
          }
          
          // Обновляем состояние отчета по испытанию
          setTrialReportStatus({
            hasReport: true,
            reportUrl,
            reportFilename: trialReportFilename
          });
          
          // Перезагружаем список отчетов
          await loadSavedReports();
        } catch (error) {
          console.error('Ошибка сохранения отчетов в базу данных:', error);
          // Не прерываем выполнение, так как отчет уже создан локально
        }
      }

      // Обновляем состояние
      setReportStatus(prev => ({
        ...prev,
        isGenerating: false,
        hasReport: true,
        reportUrl: reportUrl,
        reportFilename: reportFilename
      }));
      
      // ВАЖНО: Очищаем existingReport после успешного формирования
      // Это гарантирует, что следующее формирование создаст новый отчет,
      // а не будет добавлять данные в старый
      processor.clearExistingReport();
      console.log('Existing report cleared after successful generation');
      
    } catch (error) {
      console.error('Ошибка генерации отчета по шаблону:', error);
      alert(`Ошибка при формировании отчета по шаблону: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      setReportStatus(prev => ({ ...prev, isGenerating: false }));
      // Очищаем existingReport даже при ошибке
      const processor = DocxTemplateProcessor.getInstance();
      processor.clearExistingReport();
    }
  };

  // Функция для поворота изображения на 90° против часовой стрелки
  const rotateImage90CounterClockwise = async (imageUrl: string): Promise<Blob> => {
    return new Promise(async (resolve, reject) => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        // Если это blob URL, загружаем через fetch, чтобы получить blob объект
        // Это гарантирует, что blob будет действителен
        let blob: Blob | null = null;
        let blobUrlToRevoke: string | null = null;
        
        if (imageUrl.startsWith('blob:')) {
          // Для blob URL используем XMLHttpRequest, так как он лучше работает с blob URL
          try {
            blob = await new Promise<Blob>((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.open('GET', imageUrl, true);
              xhr.responseType = 'blob';
              
              xhr.onload = () => {
                if (xhr.status === 200 || xhr.status === 0) {
                  resolve(xhr.response);
                } else {
                  reject(new Error(`HTTP error! status: ${xhr.status}`));
                }
              };
              
              xhr.onerror = () => {
                reject(new Error('Network error при загрузке blob URL'));
              };
              
              xhr.ontimeout = () => {
                reject(new Error('Timeout при загрузке blob URL'));
              };
              
              xhr.timeout = 10000; // 10 секунд
              xhr.send();
            });
            
            // Создаем новый blob URL из полученного blob, чтобы гарантировать его действительность
            blobUrlToRevoke = URL.createObjectURL(blob);
          } catch (xhrError) {
            reject(new Error(`Не удалось загрузить изображение из blob URL: ${xhrError instanceof Error ? xhrError.message : 'Неизвестная ошибка'}`));
            return;
          }
        } else {
          // Для обычных URL загружаем через fetch
          try {
            const response = await fetch(imageUrl);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            blob = await response.blob();
            blobUrlToRevoke = URL.createObjectURL(blob);
          } catch (fetchError) {
            reject(new Error(`Не удалось загрузить изображение: ${fetchError instanceof Error ? fetchError.message : 'Неизвестная ошибка'}`));
            return;
          }
        }
        
        // Устанавливаем таймаут для загрузки
        const timeout = setTimeout(() => {
          if (blobUrlToRevoke) {
            URL.revokeObjectURL(blobUrlToRevoke);
          }
          reject(new Error('Таймаут загрузки изображения'));
        }, 10000); // 10 секунд
        
        img.onload = () => {
          clearTimeout(timeout);
          if (blobUrlToRevoke) {
            URL.revokeObjectURL(blobUrlToRevoke);
          }
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Не удалось получить контекст canvas'));
            return;
          }
          
          // Меняем местами ширину и высоту для поворота на 90°
          canvas.width = img.height;
          canvas.height = img.width;
          
          // Поворачиваем на 90° против часовой стрелки
          ctx.translate(0, canvas.height);
          ctx.rotate(-Math.PI / 2);
          ctx.drawImage(img, 0, 0);
          
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Не удалось создать blob из canvas'));
            }
          }, 'image/png');
        };
        
        img.onerror = () => {
          clearTimeout(timeout);
          if (blobUrlToRevoke) {
            URL.revokeObjectURL(blobUrlToRevoke);
          }
          reject(new Error('Не удалось загрузить изображение. Возможно, формат изображения не поддерживается.'));
        };
        
        // Используем созданный blob URL
        if (blobUrlToRevoke) {
          img.src = blobUrlToRevoke;
        } else {
          reject(new Error('Не удалось создать blob URL'));
        }
      } catch (error) {
        reject(error);
      }
    });
  };

  // Функция создания Docx файла со свидетельствами о поверке
  const handleGenerateVerificationReport = async () => {
    if (!projectId || !qualificationObjectId) {
      alert('Необходимо указать проект и объект квалификации');
      return;
    }

    setVerificationReportStatus(prev => ({ ...prev, isGenerating: true }));

    try {
      // 1. Получаем дату из этапа "Расстановка логгеров" из плана-графика
      const workSchedule = await qualificationWorkScheduleService.getWorkSchedule(
        qualificationObjectId,
        projectId
      );
      const loggerPlacementStage = workSchedule.find(
        stage => stage.stageName === 'Расстановка логгеров'
      );
      
      if (!loggerPlacementStage || !loggerPlacementStage.startDate) {
        alert('Не найдена дата этапа "Расстановка логгеров" в плане-графике');
        setVerificationReportStatus(prev => ({ ...prev, isGenerating: false }));
        return;
      }

      const placementDate = new Date(loggerPlacementStage.startDate);
      console.log('Дата расстановки логгеров:', placementDate.toLocaleDateString('ru-RU'));
      
      // Нормализуем дату расстановки (только дата, без времени)
      const placementDateOnly = new Date(placementDate);
      placementDateOnly.setHours(0, 0, 0, 0);
      
      // 2. Получаем все оборудование и ищем верификации с периодом, включающим дату расстановки
      // Вместо поиска по серийным номерам из логгеров, берем все оборудование с верификациями
      const verificationFiles: Array<{ equipment: any; verification: any; imageBlob: Blob }> = [];
      
      // Получаем все оборудование
      const allEquipment = await equipmentService.getAllEquipment(1, 1000);
      console.log(`Получено оборудования: ${allEquipment.equipment.length}`);
      
      // Проходим по всему оборудованию и ищем верификации с периодом, включающим дату расстановки
      for (const equipment of allEquipment.equipment) {
        try {
          if (!equipment.verifications || equipment.verifications.length === 0) {
            continue;
          }
          
          console.log(`Проверка оборудования: ${equipment.name}, серийный номер: ${equipment.serialNumber}, верификаций: ${equipment.verifications.length}`);
          
          // Фильтруем верификации, период которых включает дату расстановки
          const relevantVerifications = equipment.verifications.filter(verification => {
            if (!verification.verificationStartDate || !verification.verificationEndDate) {
              return false;
            }
            
            const startDate = new Date(verification.verificationStartDate);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(verification.verificationEndDate);
            endDate.setHours(23, 59, 59, 999);
            
            const isInRange = placementDateOnly >= startDate && placementDateOnly <= endDate;
            console.log(`  Верификация: ${startDate.toLocaleDateString('ru-RU')} - ${endDate.toLocaleDateString('ru-RU')}, дата расстановки: ${placementDateOnly.toLocaleDateString('ru-RU')}, входит: ${isInRange}`);
            
            return isInRange;
          });
          
          if (relevantVerifications.length > 0) {
            console.log(`  Найдено релевантных верификаций для ${equipment.name}: ${relevantVerifications.length}`);
          }

          // Для каждой релевантной верификации загружаем и поворачиваем изображение
          // Обрабатываем последовательно, чтобы избежать проблем с blob URL
          for (const verification of relevantVerifications) {
            if (verification.verificationFileUrl) {
              try {
                console.log(`  Загрузка изображения для ${equipment.name}: ${verification.verificationFileUrl}`);
                
                // Проверяем, является ли URL действительным blob URL или обычным URL
                const isBlobUrl = verification.verificationFileUrl.startsWith('blob:');
                const isHttpUrl = verification.verificationFileUrl.startsWith('http://') || verification.verificationFileUrl.startsWith('https://');
                const isLocalUrl = verification.verificationFileUrl.startsWith('/uploads/');
                
                // Если это blob URL, пытаемся загрузить его, но если не получится - пропускаем
                if (isBlobUrl) {
                  try {
                    // Пытаемся загрузить blob URL через XMLHttpRequest
                    const blob = await new Promise<Blob>((resolve, reject) => {
                      const xhr = new XMLHttpRequest();
                      xhr.open('GET', verification.verificationFileUrl!, true);
                      xhr.responseType = 'blob';
                      
                      xhr.onload = () => {
                        if (xhr.status === 200 || xhr.status === 0) {
                          resolve(xhr.response);
                        } else {
                          reject(new Error(`HTTP error! status: ${xhr.status}`));
                        }
                      };
                      
                      xhr.onerror = () => {
                        reject(new Error('Network error при загрузке blob URL'));
                      };
                      
                      xhr.ontimeout = () => {
                        reject(new Error('Timeout при загрузке blob URL'));
                      };
                      
                      xhr.timeout = 5000; // 5 секунд
                      xhr.send();
                    });
                    
                    // Если blob загружен успешно, создаем новый blob URL и обрабатываем
                    const newBlobUrl = URL.createObjectURL(blob);
                    try {
                      const rotatedImage = await rotateImage90CounterClockwise(newBlobUrl);
                      URL.revokeObjectURL(newBlobUrl);
                      
                      if (!rotatedImage || rotatedImage.size === 0) {
                        throw new Error('Получен пустой blob');
                      }
                      
                      console.log(`  Изображение успешно обработано для ${equipment.name}, размер: ${rotatedImage.size} байт, тип: ${rotatedImage.type}`);
                      verificationFiles.push({
                        equipment,
                        verification,
                        imageBlob: rotatedImage
                      });
                    } catch (rotateError) {
                      URL.revokeObjectURL(newBlobUrl);
                      throw rotateError;
                    }
                  } catch (blobError) {
                    console.warn(`  Не удалось загрузить blob URL для ${equipment.name}: ${blobError instanceof Error ? blobError.message : 'Неизвестная ошибка'}`);
                    console.warn(`  Пожалуйста, перезагрузите файл верификации для ${equipment.name} в справочнике оборудования.`);
                    continue;
                  }
                } else if (isHttpUrl || isLocalUrl) {
                  // Загружаем и обрабатываем изображение с сервера
                  const rotatedImage = await rotateImage90CounterClockwise(verification.verificationFileUrl);
                  
                  // Проверяем, что blob валиден и имеет размер
                  if (!rotatedImage || rotatedImage.size === 0) {
                    console.error(`  Получен пустой или невалидный blob для оборудования ${equipment.name}`);
                    continue;
                  }
                  
                  console.log(`  Изображение успешно обработано для ${equipment.name}, размер: ${rotatedImage.size} байт, тип: ${rotatedImage.type}`);
                  verificationFiles.push({
                    equipment,
                    verification,
                    imageBlob: rotatedImage
                  });
                } else {
                  console.warn(`  Некорректный URL для ${equipment.name}: ${verification.verificationFileUrl}`);
                  continue;
                }
              } catch (error) {
                console.error(`  Ошибка обработки изображения для оборудования ${equipment.name}:`, error);
                console.error(`  URL: ${verification.verificationFileUrl}`);
                // Продолжаем обработку других файлов, не прерывая весь процесс
                continue;
              }
            } else {
              console.log(`  Верификация для ${equipment.name} не имеет файла`);
            }
          }
        } catch (error) {
          console.error(`Ошибка обработки оборудования ${equipment.name}:`, error);
        }
      }

      // Собираем информацию об оборудовании с blob URL для отчета
      const equipmentWithBlobUrls = allEquipment.equipment
        .filter(eq => {
          const relevantVerifications = eq.verifications?.filter(v => {
            if (!v.verificationFileUrl) return false;
            const startDate = new Date(v.verificationStartDate);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(v.verificationEndDate);
            endDate.setHours(23, 59, 59, 999);
            const placementDateOnly = new Date(placementDate);
            placementDateOnly.setHours(0, 0, 0, 0);
            return placementDateOnly >= startDate && placementDateOnly <= endDate;
          }) || [];
          return relevantVerifications.some(v => v.verificationFileUrl?.startsWith('blob:'));
        })
        .map(eq => eq.name);

      if (verificationFiles.length === 0) {
        const placementDateStr = placementDate.toLocaleDateString('ru-RU');
        
        let message = `Не удалось загрузить файлы метрологической аттестации.\n\n`;
        message += `Возможные причины:\n`;
        message += `1. Файлы не были загружены на сервер (используются только локальные blob URL)\n`;
        message += `2. Период аттестации не включает дату расстановки логгеров: ${placementDateStr}\n\n`;
        
        if (equipmentWithBlobUrls.length > 0) {
          message += `⚠️ Обнаружено оборудование с blob URL (недействительными ссылками):\n${equipmentWithBlobUrls.join(', ')}\n\n`;
          message += `Действия для исправления:\n`;
          message += `1. Откройте справочник оборудования\n`;
          message += `2. Для каждого оборудования из списка выше откройте редактирование\n`;
          message += `3. Удалите старый файл верификации (кнопка X) и загрузите его заново\n`;
          message += `4. Сохраните изменения\n\n`;
        }
        
        message += `Рекомендация: Все файлы метрологической аттестации должны быть загружены на сервер.\n\n`;
        message += `Дата расстановки логгеров берется из этапа "Расстановка логгеров" в плане-графике квалификационных работ.`;
        
        alert(message);
        setVerificationReportStatus(prev => ({ ...prev, isGenerating: false }));
        return;
      } else if (equipmentWithBlobUrls.length > 0) {
        // Предупреждение, если некоторые файлы не загружены, но отчет все равно будет создан
        const message = `⚠️ Внимание!\n\n` +
          `Некоторые файлы верификации не были включены в отчет из-за недействительных blob URL:\n${equipmentWithBlobUrls.join(', ')}\n\n` +
          `Отчет будет создан с ${verificationFiles.length} файл(ами), но для полного отчета необходимо перезагрузить файлы для указанного оборудования.\n\n` +
          `Действия:\n` +
          `1. Откройте справочник оборудования\n` +
          `2. Для каждого оборудования из списка откройте редактирование\n` +
          `3. Удалите старый файл верификации и загрузите его заново\n` +
          `4. Сохраните изменения`;
        
        if (confirm(message + '\n\nПродолжить генерацию отчета с доступными файлами?')) {
          // Продолжаем генерацию отчета
        } else {
          setVerificationReportStatus(prev => ({ ...prev, isGenerating: false }));
          return;
        }
      }
      
      console.log(`Успешно обработано ${verificationFiles.length} файлов метрологической аттестации`);

      // 4. Создаем Docx файл с изображениями (2 на листе)
      const zip = new JSZip();
      
      // Создаем базовую структуру DOCX
      const wordFolder = zip.folder('word');
      if (!wordFolder) {
        throw new Error('Не удалось создать папку word');
      }

      const mediaFolder = wordFolder.folder('media');
      if (!mediaFolder) {
        throw new Error('Не удалось создать папку media');
      }

      // Создаем document.xml с изображениями
      let documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
           xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
           xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
           xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
           xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>`;

      // Размещаем изображения друг над другом, каждое занимает половину листа
      // Отслеживаем реальный индекс для relationships и список добавленных изображений
      let relationshipIndex = 1;
      const addedImages: Array<{ imageId: string; rId: number }> = [];
      
      for (let i = 0; i < verificationFiles.length; i += 2) {
        const file1 = verificationFiles[i];
        const file2 = verificationFiles[i + 1];
        
        // Проверяем, что blob валиден перед добавлением
        if (!file1.imageBlob || file1.imageBlob.size === 0) {
          console.error(`  Пропускаем невалидное изображение для ${file1.equipment.name}`);
          continue;
        }
        
        // Добавляем первое изображение в media папку
        const imageId1 = `image_${addedImages.length}`;
        mediaFolder.file(`${imageId1}.png`, file1.imageBlob);
        const rId1 = relationshipIndex++;
        addedImages.push({ imageId: imageId1, rId: rId1 });
        
        // Проверяем второе изображение
        let rId2: number | null = null;
        let imageId2: string | null = null;
        if (file2) {
          if (!file2.imageBlob || file2.imageBlob.size === 0) {
            console.error(`  Пропускаем невалидное изображение для ${file2.equipment.name}`);
          } else {
            imageId2 = `image_${addedImages.length}`;
            mediaFolder.file(`${imageId2}.png`, file2.imageBlob);
            rId2 = relationshipIndex++;
            addedImages.push({ imageId: imageId2, rId: rId2 });
          }
        }

        // Создаем таблицу с двумя изображениями друг над другом (каждое занимает половину листа)
        const hasSecondImage = rId2 !== null;
        // Размеры для половины страницы A4 (в EMU: 1 inch = 914400 EMU)
        // A4 ширина: ~8.27 inch = 7559064 EMU, высота: ~11.69 inch = 10683360 EMU
        // Половина высоты: ~5341680 EMU, ширина: ~7559064 EMU (с учетом полей используем ~7000000)
        // Уменьшено на 5% от размера после предыдущего уменьшения на 3%
        const imageWidth = 6450500;  // ~7.06 inch (уменьшено на 5% от 6790000)
        const imageHeight = 4607500; // ~5.04 inch (уменьшено на 5% от 4850000)
        
        documentXml += `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="10080" w:type="dxa"/>
        <w:tblInd w:w="0" w:type="dxa"/>
        <w:jc w:val="left"/>
        <w:tblBorders>
          <w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/>
          <w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/>
        </w:tblBorders>
      </w:tblPr>`;

        // Первое изображение - первая строка
        documentXml += `
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="9500" w:type="dxa"/>
            <w:vAlign w:val="center"/>
            <w:tcMar>
              <w:top w:w="0" w:type="dxa"/>
              <w:left w:w="0" w:type="dxa"/>
              <w:bottom w:w="0" w:type="dxa"/>
              <w:right w:w="0" w:type="dxa"/>
            </w:tcMar>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:spacing w:before="0" w:after="0"/>
              <w:ind w:left="0" w:right="0" w:firstLine="0"/>
            </w:pPr>
            <w:r>
              <w:drawing>
                <wp:inline distT="0" distB="0" distL="0" distR="0">
                  <wp:extent cx="${imageWidth}" cy="${imageHeight}"/>
                  <wp:effectExtent l="0" t="0" r="0" b="0"/>
                  <wp:docPr id="${rId1}" name="Picture ${rId1}"/>
                  <wp:cNvGraphicFramePr>
                    <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
                  </wp:cNvGraphicFramePr>
                  <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                    <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                      <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                        <pic:nvPicPr>
                          <pic:cNvPr id="0" name="Picture"/>
                          <pic:cNvPicPr/>
                        </pic:nvPicPr>
                        <pic:blipFill>
                          <a:blip r:embed="rId${rId1}"/>
                          <a:stretch>
                            <a:fillRect/>
                          </a:stretch>
                        </pic:blipFill>
                        <pic:spPr>
                          <a:xfrm>
                            <a:off x="0" y="0"/>
                            <a:ext cx="${imageWidth}" cy="${imageHeight}"/>
                          </a:xfrm>
                          <a:prstGeom prst="rect">
                            <a:avLst/>
                          </a:prstGeom>
                        </pic:spPr>
                      </pic:pic>
                    </a:graphicData>
                  </a:graphic>
                </wp:inline>
              </w:drawing>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>`;

        // Второе изображение - вторая строка (только если валидно)
        if (hasSecondImage && rId2 !== null) {
          documentXml += `
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="9500" w:type="dxa"/>
            <w:vAlign w:val="center"/>
            <w:tcMar>
              <w:top w:w="0" w:type="dxa"/>
              <w:left w:w="0" w:type="dxa"/>
              <w:bottom w:w="0" w:type="dxa"/>
              <w:right w:w="0" w:type="dxa"/>
            </w:tcMar>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:spacing w:before="0" w:after="0"/>
              <w:ind w:left="0" w:right="0" w:firstLine="0"/>
            </w:pPr>
            <w:r>
              <w:drawing>
                <wp:inline distT="0" distB="0" distL="0" distR="0">
                  <wp:extent cx="${imageWidth}" cy="${imageHeight}"/>
                  <wp:effectExtent l="0" t="0" r="0" b="0"/>
                  <wp:docPr id="${rId2}" name="Picture ${rId2}"/>
                  <wp:cNvGraphicFramePr>
                    <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
                  </wp:cNvGraphicFramePr>
                  <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                    <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                      <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                        <pic:nvPicPr>
                          <pic:cNvPr id="0" name="Picture"/>
                          <pic:cNvPicPr/>
                        </pic:nvPicPr>
                        <pic:blipFill>
                          <a:blip r:embed="rId${rId2}"/>
                          <a:stretch>
                            <a:fillRect/>
                          </a:stretch>
                        </pic:blipFill>
                        <pic:spPr>
                          <a:xfrm>
                            <a:off x="0" y="0"/>
                            <a:ext cx="${imageWidth}" cy="${imageHeight}"/>
                          </a:xfrm>
                          <a:prstGeom prst="rect">
                            <a:avLst/>
                          </a:prstGeom>
                        </pic:spPr>
                      </pic:pic>
                    </a:graphicData>
                  </a:graphic>
                </wp:inline>
              </w:drawing>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>`;
        }
        
        documentXml += `
    </w:tbl>`;
        
        // Добавляем разрыв страницы после каждой пары изображений (кроме последней)
        if (i + 2 < verificationFiles.length) {
          documentXml += `
    <w:p>
      <w:r>
        <w:br w:type="page"/>
      </w:r>
    </w:p>`;
        }
      }

      // Добавляем настройки страницы с левым и правым полем 1,27 см
      // 1,27 см = 0.5 дюйма = 720 twips (1 дюйм = 1440 twips, 1 см = 567 twips)
      // Стандартные поля: верхнее/нижнее 1440 twips (1 дюйм)
      documentXml += `
  </w:body>
  <w:sectPr>
    <w:pgMar w:left="720" w:right="720" w:top="1440" w:bottom="1440" w:header="708" w:footer="708" w:gutter="0"/>
    <w:pgSz w:w="11906" w:h="16838"/>
    <w:pgNumType w:start="1"/>
    <w:formProt w:val="false"/>
    <w:textDirection w:val="lrTb"/>
    <w:docGrid w:linePitch="360"/>
  </w:sectPr>
</w:document>`;

      wordFolder.file('document.xml', documentXml);

      // Создаем relationships только для реально добавленных изображений
      let relationshipsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`;

      for (const image of addedImages) {
        relationshipsXml += `
  <Relationship Id="rId${image.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${image.imageId}.png"/>`;
      }

      relationshipsXml += `
</Relationships>`;

      wordFolder.file('_rels/document.xml.rels', relationshipsXml);

      // Создаем базовые файлы DOCX
      zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Default Extension="png" ContentType="image/png"/>
</Types>`);

      zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

      // Генерируем DOCX файл
      const docxBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      // Создаем URL для скачивания
      const now = new Date();
      const reportUrl = URL.createObjectURL(docxBlob);
      const reportFilename = `приложение_свидетельства_о_поверке_${now.toISOString().slice(0, 10)}.docx`;

      // Сохраняем отчет в базу данных
      if (reportService.isAvailable() && projectId && qualificationObjectId && user?.id) {
        try {
          const reportName = 'Приложение свидетельства о поверке';
          const existingReport = await reportService.findExistingReport(
            projectId,
            qualificationObjectId,
            reportName
          );

          // Сохраняем blob в localStorage для надежности (как для других отчетов)
          const verificationReportKey = `verification_report_${existingReport?.id || 'new'}`;
          const reportArrayBuffer = await docxBlob.arrayBuffer();
          localStorage.setItem(verificationReportKey, JSON.stringify(Array.from(new Uint8Array(reportArrayBuffer))));

          if (existingReport) {
            await reportService.updateReport(existingReport.id!, {
              reportUrl,
              reportFilename,
              reportData: {
                placementDate: placementDate.toISOString(),
                equipmentCount: allEquipment.equipment.length,
                verificationCount: verificationFiles.length
              }
            });
            // Обновляем ключ localStorage с правильным ID
            if (existingReport.id) {
              const correctKey = `verification_report_${existingReport.id}`;
              localStorage.setItem(correctKey, JSON.stringify(Array.from(new Uint8Array(reportArrayBuffer))));
              localStorage.removeItem(verificationReportKey);
            }
          } else {
            const savedReport = await reportService.saveReport({
              projectId,
              qualificationObjectId,
              reportName,
              reportType: 'template',
              reportUrl,
              reportFilename,
              reportData: {
                placementDate: placementDate.toISOString(),
                equipmentCount: allEquipment.equipment.length,
                verificationCount: verificationFiles.length
              },
              createdBy: user.id
            });
            // Обновляем ключ localStorage с правильным ID после сохранения
            if (savedReport.id) {
              const correctKey = `verification_report_${savedReport.id}`;
              localStorage.setItem(correctKey, JSON.stringify(Array.from(new Uint8Array(reportArrayBuffer))));
              localStorage.removeItem(verificationReportKey);
            }
          }

          // Перезагружаем список отчетов
          await loadSavedReports();
        } catch (error) {
          console.error('Ошибка сохранения отчета в базу данных:', error);
        }
      }

      // Обновляем состояние
      setVerificationReportStatus({
        isGenerating: false,
        hasReport: true,
        reportUrl,
        reportFilename
      });

      // Автоматически скачиваем файл
      const link = document.createElement('a');
      link.href = reportUrl;
      link.download = reportFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Ошибка генерации приложения свидетельства о поверке:', error);
      alert(`Ошибка при формировании приложения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      setVerificationReportStatus(prev => ({ ...prev, isGenerating: false }));
    }
  };

  const handleDownloadReport = () => {
    if (reportStatus.reportUrl && reportStatus.reportFilename) {
      const link = document.createElement('a');
      link.href = reportStatus.reportUrl;
      link.download = reportStatus.reportFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDeleteReport = async () => {
    if (reportStatus.reportUrl) {
      URL.revokeObjectURL(reportStatus.reportUrl);
    }

    // Очищаем существующий отчет в процессоре
    const processor = DocxTemplateProcessor.getInstance();
    processor.clearExistingReport();

    // Удаляем отчет по испытанию из базы данных
    if (reportService.isAvailable() && projectId && qualificationObjectId) {
      try {
        const dataTypeLabel = dataType === 'temperature' ? 'температура' : 'влажность';
        const trialReportName = `Отчет по испытанию ${dataTypeLabel}`;
        const trialReport = await reportService.findExistingReport(projectId, qualificationObjectId, trialReportName);
        
        if (trialReport) {
          await reportService.deleteReport(trialReport.id!);
          console.log('Отчет по испытанию удален из базы данных');
        }
      } catch (error) {
        console.error('Ошибка удаления отчета по испытанию из базы данных:', error);
      }
    }

    setReportStatus({
      isGenerating: false,
      hasReport: false,
      reportUrl: null,
      reportFilename: null,
      templateFile: null,
      templateValidation: null
    });

    // Очищаем состояние отчета по испытанию
    setTrialReportStatus({
      hasReport: false,
      reportUrl: null,
      reportFilename: null
    });

    // Перезагружаем список отчетов
    await loadSavedReports();
  };

  // Загрузка сохраненного отчета
  const handleLoadSavedReport = async (report: ReportData) => {
    try {
      // Загружаем данные отчета
      const reportData = report.reportData;
      
      // Восстанавливаем состояние анализа
      if (reportData.dataType && (reportData.dataType === 'temperature' || reportData.dataType === 'humidity')) {
        setDataType(reportData.dataType as DataType);
      }
      if (reportData.contractFields) {
        setContractFields(reportData.contractFields);
      }
      if (reportData.conclusions) {
        setConclusions(reportData.conclusions);
      }
      if (reportData.markers) {
        setMarkers(reportData.markers);
      }
      if (reportData.limits) {
        setLimits(reportData.limits);
      }

      // Создаем URL для скачивания
      const reportUrl = report.reportUrl;
      
      setReportStatus(prev => ({
        ...prev,
        hasReport: true,
        reportUrl,
        reportFilename: report.reportFilename
      }));

      console.log('Отчет загружен:', report.reportName);
    } catch (error) {
      console.error('Ошибка загрузки отчета:', error);
      alert('Ошибка при загрузке отчета');
    }
  };

  // Удаление сохраненного отчета
  const handleDeleteSavedReport = async (reportId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот отчет?')) {
      return;
    }

    try {
      await reportService.deleteReport(reportId);
      await loadSavedReports();
      console.log('Отчет удален');
    } catch (error) {
      console.error('Ошибка удаления отчета:', error);
      alert('Ошибка при удалении отчета');
    }
  };

  // Скачивание сохраненного отчета
  const handleDownloadSavedReport = async (report: ReportData) => {
    try {
      console.log('Скачиваем отчет:', report);
      console.log('reportFilename:', report.reportFilename);
      console.log('reportName:', report.reportName);
      
      let reportBlob: Blob | null = null;
      
      // Сначала пытаемся использовать URL из базы данных
      if (report.reportUrl) {
        try {
          const response = await fetch(report.reportUrl);
          if (response.ok) {
            reportBlob = await response.blob();
            console.log('Отчет загружен из URL');
          }
        } catch (error) {
          console.warn('Не удалось загрузить отчет по URL, пробуем localStorage:', error);
        }
      }
      
      // Если не удалось загрузить по URL, пробуем localStorage
      if (!reportBlob && report.id) {
        // Определяем ключ в зависимости от типа отчета
        let reportKey: string;
        if (report.reportName.includes('Сводный отчет')) {
          reportKey = `summary_report_${report.id}`;
        } else if (report.reportName.includes('Отчет по испытанию')) {
          reportKey = `trial_report_${report.id}`;
        } else if (report.reportName.includes('Приложение свидетельства о поверке')) {
          reportKey = `verification_report_${report.id}`;
        } else {
          reportKey = `report_${report.id}`;
        }
        
        const storedData = localStorage.getItem(reportKey);
        
        if (storedData) {
          try {
            const arrayBuffer = new Uint8Array(JSON.parse(storedData));
            reportBlob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
            console.log('Отчет загружен из localStorage');
          } catch (error) {
            console.error('Ошибка восстановления отчета из localStorage:', error);
          }
        }
      }
      
      if (!reportBlob) {
        alert('Отчет недоступен для скачивания. Попробуйте сформировать отчет заново.');
        return;
      }

      // Создаем временную ссылку для скачивания
      const blobUrl = URL.createObjectURL(reportBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      
      // Определяем имя файла: используем reportFilename, если есть, иначе генерируем из reportName
      let filename = report.reportFilename;
      if (!filename || filename === 'null' || filename === 'undefined') {
        // Генерируем имя файла из названия отчета
        const sanitizedName = report.reportName
          .replace(/[<>:"/\\|?*]/g, '_') // Заменяем недопустимые символы
          .replace(/\s+/g, '_') // Заменяем пробелы на подчеркивания
          .toLowerCase();
        filename = `${sanitizedName}.docx`;
      }
      
      link.download = filename;
      
      // Добавляем ссылку в DOM, кликаем и удаляем
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Освобождаем blob URL
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      
      console.log('Отчет скачан:', filename);
    } catch (error) {
      console.error('Ошибка скачивания отчета:', error);
      alert('Ошибка при скачивании отчета');
    }
  };

  const handleAutoFillConclusions = () => {
    // Принудительно обновляем результаты анализа при каждом нажатии кнопки
    setAnalysisResultsRefreshKey(prev => prev + 1);
    // Показываем результаты анализа и выводы
    setShowAnalysisResults(true);
    // Специальная логика для типа испытания "Испытание на восстановление температуры после открытия двери"
    if (contractFields.testType === 'temperature_recovery') {
      if (!data || !limits.temperature || !limits.temperature.min || !limits.temperature.max) {
        setConclusions('Недостаточно данных для формирования выводов.');
        return;
      }

      // Получаем маркеры в последовательности: Открытие двери -> Закрытие двери -> Восстановление температуры
      const doorMarkers = markers.filter(m => 
        m.type === 'door_opening' || m.type === 'door_closing' || m.type === 'temperature_recovery'
      ).sort((a, b) => a.timestamp - b.timestamp);
      
      // Исключаем внешние датчики
      const nonExternalResults = visibleAnalysisResults.filter(result => {
        const isExternal = result.isExternal || result.zoneNumber === 'Внешний' || result.zoneNumber === '0';
        return !isExternal;
      });
      
      if (nonExternalResults.length === 0) {
        setConclusions('Недостаточно данных для формирования выводов.');
        return;
      }

      // Для каждого логгера вычисляем время нахождения за пределами
      const loggerRecoveryData = nonExternalResults.map(result => {
        const zoneNumber = result.zoneNumberRaw !== undefined ? result.zoneNumberRaw : (result.zoneNumber === 'Внешний' || result.zoneNumber === '0' ? 0 : parseInt(String(result.zoneNumber)) || 0);
        const resultLevel = typeof result.measurementLevel === 'string' ? result.measurementLevel : String(result.measurementLevel || 'unknown');
        const filePoints = data.points.filter(p => {
          const pZone = p.zoneNumber !== null && p.zoneNumber !== undefined ? p.zoneNumber : 0;
          const pLevel = p.measurementLevel?.toString() || 'unknown';
          return `${pZone}_${pLevel}` === `${zoneNumber}_${resultLevel}`;
        });
        
        const recoveryData = calculateRecoveryTimeAfterDoorOpening(
          filePoints,
          doorMarkers,
          limits.temperature?.min,
          limits.temperature?.max
        );
        
        // Парсим время из формата "час:мин" или "за пределы не выходила"
        let timeInMinutes = 0;
        if (recoveryData.time !== 'за пределы не выходила' && recoveryData.time !== '-') {
          const timeMatch = recoveryData.time.match(/(\d+):(\d+)/);
          if (timeMatch) {
            const hours = parseInt(timeMatch[1]) || 0;
            const minutes = parseInt(timeMatch[2]) || 0;
            timeInMinutes = hours * 60 + minutes;
          }
        }
        
        return {
          loggerName: result.loggerName,
          recoveryTime: recoveryData.time,
          meetsCriterion: recoveryData.meetsCriterion,
          timeInMinutes: timeInMinutes
        };
      });

      // Находим логгер с максимальным временем нахождения за пределами
      const maxTimeLogger = loggerRecoveryData.reduce((max, current) => {
        return current.timeInMinutes > max.timeInMinutes ? current : max;
      }, loggerRecoveryData[0]);

      // Определяем, выходила ли температура за пределы
      const hasExceededLimits = loggerRecoveryData.some(logger => logger.timeInMinutes > 0);
      
      // Получаем критерий приемлемости
      const acceptanceCriterion = contractFields.acceptanceCriterion 
        ? parseInt(contractFields.acceptanceCriterion) 
        : 0;

      // Определяем общий результат испытания (соответствует/не соответствует)
      // Если хотя бы один логгер не соответствует критерию, общий результат - не соответствует
      const overallMeetsCriterion = loggerRecoveryData.every(logger => logger.meetsCriterion === 'Да');

      // Получаем маркеры времени для вывода
      const openingMarkers = doorMarkers.filter(m => m.type === 'door_opening');
      const closingMarkers = doorMarkers.filter(m => m.type === 'door_closing');
      
      // Формируем информацию о маркерах времени с точностью до минут (без секунд)
      let markersInfo = '';
      if (openingMarkers.length > 0) {
        const openingMarker = openingMarkers[0]; // Берем первый маркер открытия
        const openingTimeStr = new Date(openingMarker.timestamp).toLocaleString('ru-RU', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
        markersInfo += `<b>Открытие двери:</b> ${openingTimeStr}. `;
      }
      if (closingMarkers.length > 0) {
        const closingMarker = closingMarkers[0]; // Берем первый маркер закрытия
        const closingTimeStr = new Date(closingMarker.timestamp).toLocaleString('ru-RU', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
        markersInfo += `\n<b>Закрытие двери:</b> ${closingTimeStr}. `;
      }

      // Формируем текст выводов с форматированием (жирный текст для постоянного, обычный для подставляемого)
      let conclusionText = '';
      
      if (!hasExceededLimits) {
        // Температура не выходила за пределы (выделение только у «Открытие/Закрытие двери» и «Результат испытания заданному критерию приемлемости»)
        conclusionText = `${markersInfo}За время проведения испытания температура за контролируемые пределы не выходила, что соответствует установленному критерию приемлемости (${acceptanceCriterion} мин).\n<b>Результат испытания заданному критерию приемлемости</b> ${overallMeetsCriterion ? 'соответствует' : 'не соответствует'}.`;
      } else {
        // Температура выходила за пределы (без «зафиксировано логгером» и номера логгера; выделение только у маркеров и «Результат испытания заданному критерию приемлемости»)
        const maxTimeText = maxTimeLogger.recoveryTime;
        const maxTimeMeetsCriterion = maxTimeLogger.meetsCriterion === 'Да' ? 'соответствует' : 'не соответствует';
        conclusionText = `${markersInfo}За время проведения испытания температура за контролируемые пределы выходила, максимальное время выхода составило ${maxTimeText}, что ${maxTimeMeetsCriterion} установленному критерию приемлемости (${acceptanceCriterion} мин).\n<b>Результат испытания заданному критерию приемлемости</b> ${overallMeetsCriterion ? 'соответствует' : 'не соответствует'}.`;
      }

      setConclusions(conclusionText);
      return;
    }

    // Специальная логика для типа испытания "Испытание на сбой электропитания (включение)"
    if (contractFields.testType === 'power_on') {
      if (!data || !limits.temperature || !limits.temperature.min || !limits.temperature.max) {
        setConclusions('Недостаточно данных для формирования выводов.');
        return;
      }

      const testMarker = getTestMarker();
      if (!testMarker) {
        setConclusions('Не найден маркер времени включения электропитания.');
        return;
      }

      // Исключаем внешние датчики
      const nonExternalResults = visibleAnalysisResults.filter(result => {
        const isExternal = result.isExternal || result.zoneNumber === 'Внешний' || result.zoneNumber === '0';
        return !isExternal;
      });
      
      if (nonExternalResults.length === 0) {
        setConclusions('Недостаточно данных для формирования выводов.');
        return;
      }

      // Для каждого логгера вычисляем время восстановления
      const loggerRecoveryData = nonExternalResults.map(result => {
        const zoneNumber = result.zoneNumberRaw !== undefined ? result.zoneNumberRaw : (result.zoneNumber === 'Внешний' || result.zoneNumber === '0' ? 0 : parseInt(String(result.zoneNumber)) || 0);
        const resultLevel = typeof result.measurementLevel === 'string' ? result.measurementLevel : String(result.measurementLevel || 'unknown');
        
        // Фильтруем точки по зоне и уровню, учитывая выделенный диапазон (zoomState)
        let filePoints = data.points.filter(p => {
          const pZone = p.zoneNumber !== null && p.zoneNumber !== undefined ? p.zoneNumber : 0;
          const pLevel = p.measurementLevel?.toString() || 'unknown';
          return `${pZone}_${pLevel}` === `${zoneNumber}_${resultLevel}`;
        });
        
        // Если есть выделенный диапазон (zoomState), используем только эти данные
        if (zoomState) {
          filePoints = filePoints.filter(p => 
            p.timestamp >= zoomState.startTime && p.timestamp <= zoomState.endTime
          );
        }
        
        const recoveryTime = calculateRecoveryTimeAfterPowerOn(
          filePoints,
          testMarker.timestamp,
          limits.temperature?.min,
          limits.temperature?.max
        );
        
        // Преобразуем время в миллисекунды для сравнения
        let timeInMilliseconds = 0;
        if (recoveryTime !== '-' && recoveryTime !== 'за пределы не выходила') {
          // Формат: "n:nn" (часы:минуты) или "n часов nn минут"
          if (recoveryTime.includes(':')) {
            const parts = recoveryTime.split(':');
            if (parts.length === 2) {
              const hours = parseInt(parts[0]) || 0;
              const minutes = parseInt(parts[1]) || 0;
              timeInMilliseconds = (hours * 60 + minutes) * 60 * 1000;
            }
          } else {
            // Парсим формат "n часов nn минут"
            const hoursMatch = recoveryTime.match(/(\d+)\s*час/);
            const minutesMatch = recoveryTime.match(/(\d+)\s*минут/);
            const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
            const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
            timeInMilliseconds = (hours * 60 + minutes) * 60 * 1000;
          }
        }
        
        return {
          recoveryTime,
          timeInMilliseconds,
          isOutOfRange: recoveryTime === 'за пределы не выходила'
        };
      });

      // Проверяем, все ли значения не выходили за пределы
      const allWithinLimits = loggerRecoveryData.every(logger => logger.isOutOfRange);
      
      // Форматируем дату и время начала испытания
      const startTimeStr = new Date(testMarker.timestamp).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      let conclusionText = '';
      
      if (allWithinLimits) {
        // Все значения не выходили за пределы
        conclusionText = `<b>Начало испытания: </b>  ${startTimeStr}.\nЗа время проведения испытания температура не выходила за допустимые пределы.`;
      } else {
        // Находим максимальное время восстановления (исключая "за пределы не выходила")
        const validTimes = loggerRecoveryData.filter(logger => !logger.isOutOfRange && logger.timeInMilliseconds > 0);
        
        if (validTimes.length === 0) {
          conclusionText = `<b>Начало испытания: </b>  ${startTimeStr}.\nЗа время проведения испытания температура не выходила за допустимые пределы.`;
        } else {
          const maxTimeLogger = validTimes.reduce((max, current) => {
            return current.timeInMilliseconds > max.timeInMilliseconds ? current : max;
          });
          // Формат Ч:ММ (без слова «минут»), без выделения значения и сопровождающего текста
          const totalMinutes = Math.floor(maxTimeLogger.timeInMilliseconds / (1000 * 60));
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          const maxTimeText = `${hours}:${String(minutes).padStart(2, '0')}`;
          conclusionText = `<b>Начало испытания: </b>  ${startTimeStr}.\nМаксимальное время восстановления температуры при включении электропитания составляет ${maxTimeText}.`;
        }
      }

      setConclusions(conclusionText);
      return;
    }

    // Специальная логика для типа испытания "Испытание на сбой электропитания (отключение)"
    if (contractFields.testType === 'power_off') {
      if (!data || !limits.temperature || !limits.temperature.min || !limits.temperature.max) {
        setConclusions('Недостаточно данных для формирования выводов.');
        return;
      }

      const testMarker = getTestMarker();
      if (!testMarker) {
        setConclusions('Не найден маркер времени отключения электропитания.');
        return;
      }

      // Исключаем внешние датчики
      const nonExternalResults = visibleAnalysisResults.filter(result => {
        const isExternal = result.isExternal || result.zoneNumber === 'Внешний' || result.zoneNumber === '0';
        return !isExternal;
      });
      
      if (nonExternalResults.length === 0) {
        setConclusions('Недостаточно данных для формирования выводов.');
        return;
      }

      // Для каждого логгера вычисляем время нахождения в диапазоне
      const loggerTimeData = nonExternalResults.map(result => {
        const zoneNumber = result.zoneNumberRaw !== undefined ? result.zoneNumberRaw : (result.zoneNumber === 'Внешний' || result.zoneNumber === '0' ? 0 : parseInt(String(result.zoneNumber)) || 0);
        const resultLevel = typeof result.measurementLevel === 'string' ? result.measurementLevel : String(result.measurementLevel || 'unknown');
        
        // Фильтруем точки по зоне и уровню, учитывая выделенный диапазон (zoomState)
        let filePoints = data.points.filter(p => {
          const pZone = p.zoneNumber !== null && p.zoneNumber !== undefined ? p.zoneNumber : 0;
          const pLevel = p.measurementLevel?.toString() || 'unknown';
          return `${pZone}_${pLevel}` === `${zoneNumber}_${resultLevel}`;
        });
        
        // Если есть выделенный диапазон (zoomState), используем только эти данные
        if (zoomState) {
          filePoints = filePoints.filter(p => 
            p.timestamp >= zoomState.startTime && p.timestamp <= zoomState.endTime
          );
        }
        
        const timeInRange = calculateTimeInRangeAfterPowerOff(
          filePoints,
          testMarker.timestamp,
          limits.temperature?.min,
          limits.temperature?.max
        );
        
        // Преобразуем время в минуты для сравнения
        let timeInMinutes = 0;
        if (timeInRange !== '-' && timeInRange !== 'за пределы не выходила') {
          // Формат: "n:nn" (часы:минуты)
          const parts = timeInRange.split(':');
          if (parts.length === 2) {
            const hours = parseInt(parts[0]) || 0;
            const minutes = parseInt(parts[1]) || 0;
            timeInMinutes = hours * 60 + minutes;
          }
        }
        
        return {
          timeInRange,
          timeInMinutes,
          isOutOfRange: timeInRange === 'за пределы не выходила'
        };
      });

      // Проверяем, все ли значения не выходили за пределы
      const allOutOfRange = loggerTimeData.every(logger => logger.isOutOfRange);
      
      // Форматируем дату и время начала испытания
      const startTimeStr = new Date(testMarker.timestamp).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      let conclusionText = '';
      
      if (allOutOfRange) {
        // Все значения не выходили за пределы
        conclusionText = `<b>Начало испытания: </b>  ${startTimeStr}.\nЗа время проведения испытания температура не выходила за допустимые пределы.`;
      } else {
        // Находим минимальное время (исключая "за пределы не выходила")
        const validTimes = loggerTimeData.filter(logger => !logger.isOutOfRange && logger.timeInMinutes > 0);
        
        if (validTimes.length === 0) {
          conclusionText = `<b>Начало испытания: </b>  ${startTimeStr}.\nЗа время проведения испытания температура не выходила за допустимые пределы.`;
        } else {
          const minTimeLogger = validTimes.reduce((min, current) => {
            return current.timeInMinutes < min.timeInMinutes ? current : min;
          });
          // Формат Ч:ММ (без слова «минут»), без выделения значения и сопровождающего текста
          const hours = Math.floor(minTimeLogger.timeInMinutes / 60);
          const minutes = minTimeLogger.timeInMinutes % 60;
          const timeText = `${hours}:${String(minutes).padStart(2, '0')}`;
          conclusionText = `<b>Начало испытания: </b>  ${startTimeStr}.\nМинимальное время поддержания температуры при отключении электропитания составляет ${timeText}.`;
        }
      }

      setConclusions(conclusionText);
      return;
    }

    // Стандартная логика для других типов испытаний
    // Определяем временные рамки
    let startTime: Date;
    let endTime: Date;
    let duration: number;

    // Используем маркеры "Начало испытания" и "Завершение испытания" для определения временных рамок
    const startMarkers = markers
      .filter(m => m.type === 'test_start')
      .sort((a, b) => a.timestamp - b.timestamp);
    const endMarkers = markers
      .filter(m => m.type === 'test_end')
      .sort((a, b) => a.timestamp - b.timestamp);

    if (startMarkers.length > 0 && endMarkers.length > 0) {
      // Используем первый маркер начала и последний маркер завершения
      startTime = new Date(startMarkers[0].timestamp);
      // Находим последний маркер завершения, который идет после первого начала
      const lastEndMarker = endMarkers
        .filter(e => e.timestamp >= startMarkers[0].timestamp)
        .sort((a, b) => b.timestamp - a.timestamp)[0];
      if (lastEndMarker) {
        endTime = new Date(lastEndMarker.timestamp);
      } else {
        // Если нет завершения после начала, используем последний доступный маркер завершения
        endTime = new Date(endMarkers[endMarkers.length - 1].timestamp);
      }
    } else if (startMarkers.length > 0) {
      // Если есть только начало, используем его и конец данных
      startTime = new Date(startMarkers[0].timestamp);
      if (zoomState) {
        endTime = new Date(zoomState.endTime);
      } else if (data && data.points.length > 0) {
        const sortedPoints = [...data.points].sort((a, b) => b.timestamp - a.timestamp);
        endTime = new Date(sortedPoints[0].timestamp);
      } else {
        endTime = new Date();
      }
    } else if (zoomState) {
      // Если применен зум, используем его границы
      startTime = new Date(zoomState.startTime);
      endTime = new Date(zoomState.endTime);
    } else if (data) {
      // Иначе используем полный диапазон данных
      startTime = new Date(data.timeRange[0]);
      endTime = new Date(data.timeRange[1]);
    } else {
      return; // Нет данных для анализа
    }

    duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // в минутах

    // Форматируем длительность
    let durationText: string;
    if (duration >= 60) {
      const hours = Math.floor(duration / 60);
      const minutes = duration % 60;
      if (minutes === 0) {
        durationText = `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}`;
      } else {
        const hoursText = hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов';
        const minutesText = minutes === 1 ? 'минута' : minutes < 5 ? 'минуты' : 'минут';
        durationText = `${hours} ${hoursText} ${minutes} ${minutesText}`;
      }
    } else {
      const minutesText = duration === 1 ? 'минута' : duration < 5 ? 'минуты' : 'минут';
      durationText = `${duration} ${minutesText}`;
    }

    // Находим минимальное и максимальное значения (исключая внешние датчики)
    const nonExternalResults = analysisResults.filter(result => !result.isExternal);
    const isHumidity = dataType === 'humidity';
    const validResults = nonExternalResults.filter(result =>
      isHumidity
        ? (result as any).minHumidity !== '-' && (result as any).maxHumidity !== '-'
        : result.minTemp !== '-' && result.maxTemp !== '-'
    );

    if (validResults.length === 0) {
      setConclusions('Недостаточно данных для формирования выводов.');
      return;
    }

    // Находим результат с минимальным значением (температура или влажность)
    const minTempResult = validResults.reduce((min, current) => {
      const minVal = parseFloat(isHumidity ? (min as any).minHumidity : min.minTemp);
      const currentMinVal = parseFloat(isHumidity ? (current as any).minHumidity : current.minTemp);
      return currentMinVal < minVal ? current : min;
    });

    // Находим результат с максимальным значением (температура или влажность)
    const maxTempResult = validResults.reduce((max, current) => {
      const maxVal = parseFloat(isHumidity ? (max as any).maxHumidity : max.maxTemp);
      const currentMaxVal = parseFloat(isHumidity ? (current as any).maxHumidity : current.maxTemp);
      return currentMaxVal > maxVal ? current : max;
    });

    // Проверяем соответствие лимитам
    let meetsLimits = true;
    if (isHumidity && limits.humidity) {
      const minVal = parseFloat((minTempResult as any).minHumidity);
      const maxVal = parseFloat((maxTempResult as any).maxHumidity);
      if (limits.humidity.min !== undefined && minVal < limits.humidity.min) meetsLimits = false;
      if (limits.humidity.max !== undefined && maxVal > limits.humidity.max) meetsLimits = false;
    } else if (!isHumidity && limits.temperature) {
      const minTemp = parseFloat(minTempResult.minTemp);
      const maxTemp = parseFloat(maxTempResult.maxTemp);
      if (limits.temperature.min !== undefined && minTemp < limits.temperature.min) meetsLimits = false;
      if (limits.temperature.max !== undefined && maxTemp > limits.temperature.max) meetsLimits = false;
    }

    // Формируем текст выводов
    // Для empty_volume и loaded_volume применяем форматирование с жирным шрифтом для определенных фраз
    if (contractFields.testType === 'empty_volume' || contractFields.testType === 'loaded_volume') {
      const resultStr = `${meetsLimits ? 'соответствуют' : 'не соответствуют'} заданному критерию приемлемости.`;

      if (isHumidity) {
        // Влажность: только даты, значения влажности в зоне/высоте, без длительности
        const startTimeStr = startTime.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        const endTimeStr = endTime.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        const minValueStr = `${(minTempResult as any).minHumidity}% в зоне измерения ${minTempResult.zoneNumber} на высоте ${minTempResult.measurementLevel} м.`;
        const maxValueStr = `${(maxTempResult as any).maxHumidity}% в зоне измерения ${maxTempResult.zoneNumber} на высоте ${maxTempResult.measurementLevel} м.`;
        const conclusionText = `<b>Начало испытания: </b>${startTimeStr}.\n<b>Завершение испытания: </b>${endTimeStr}.\n<b>Зафиксированное минимальное значение: </b>${minValueStr}\n<b>Зафиксированное максимальное значение: </b>${maxValueStr}\n<b>Результаты испытания: </b>${resultStr}`;
        setConclusions(conclusionText);
      } else {
        // Помещение, температура: начало и завершение — только дата
        const startTimeStr = startTime.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        const endTimeStr = endTime.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        // Для Холодильник и Морозильник — «в зоне измерения X», для остальных — «логгер DL-XXX»
        const fridgeFreezerTypes = ['холодильник', 'морозильник'];
        const isFridgeOrFreezer = qualificationObject?.type && fridgeFreezerTypes.includes(String(qualificationObject.type).toLowerCase());
        let minValueStr: string;
        let maxValueStr: string;
        if (isFridgeOrFreezer) {
          minValueStr = `${minTempResult.minTemp}°C, в зоне измерения ${minTempResult.zoneNumber}.`;
          maxValueStr = `${maxTempResult.maxTemp}°C, в зоне измерения ${maxTempResult.zoneNumber}.`;
        } else {
          const minLoggerName = (minTempResult as any).loggerName || `зона ${minTempResult.zoneNumber}, высота ${minTempResult.measurementLevel} м`;
          const maxLoggerName = (maxTempResult as any).loggerName || `зона ${maxTempResult.zoneNumber}, высота ${maxTempResult.measurementLevel} м`;
          minValueStr = `${minTempResult.minTemp}°C, логгер ${minLoggerName}.`;
          maxValueStr = `${maxTempResult.maxTemp}°C, логгер ${maxLoggerName}.`;
        }
        const conclusionText = `<b>Начало испытания: </b>${startTimeStr}.\n<b>Завершение испытания: </b>${endTimeStr}.\n<b>Зафиксированное минимальное значение: </b>${minValueStr}\n<b>Зафиксированное максимальное значение: </b>${maxValueStr}\n<b>Результаты испытания: </b>${resultStr}`;
        setConclusions(conclusionText);
      }
    } else {
      // Для температуры у объектов Морозильник, Холодильник, Холодильная камера — тот же формат, что и для помещения (с жирным, без длительности)
      const refrigerationTypes: string[] = ['морозильник', 'холодильник', 'холодильная_камера'];
      const isRefrigerationObject = qualificationObject?.type && refrigerationTypes.includes(String(qualificationObject.type).toLowerCase());
      const useRoomStyleForTemperature = !isHumidity && isRefrigerationObject;

      if (useRoomStyleForTemperature) {
        const resultStr = `${meetsLimits ? 'соответствуют' : 'не соответствуют'} заданному критерию приемлемости.`;
        // Начало и завершение испытания — только дата (как для помещения)
        const startTimeStr = startTime.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        const endTimeStr = endTime.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        const minLoggerName = (minTempResult as any).loggerName || `зона ${minTempResult.zoneNumber}, высота ${minTempResult.measurementLevel} м`;
        const maxLoggerName = (maxTempResult as any).loggerName || `зона ${maxTempResult.zoneNumber}, высота ${maxTempResult.measurementLevel} м`;
        const minValueStr = `${minTempResult.minTemp}°C, логгер ${minLoggerName}.`;
        const maxValueStr = `${maxTempResult.maxTemp}°C, логгер ${maxLoggerName}.`;
        const conclusionText = `<b>Начало испытания: </b>${startTimeStr}.\n<b>Завершение испытания: </b>${endTimeStr}.\n<b>Зафиксированное минимальное значение: </b>${minValueStr}\n<b>Зафиксированное максимальное значение: </b>${maxValueStr}\n<b>Результаты испытания: </b>${resultStr}`;
        setConclusions(conclusionText);
      } else {
        // Для других типов испытаний / влажность — стандартное форматирование
        const minValStr = isHumidity ? `${(minTempResult as any).minHumidity}%` : `${minTempResult.minTemp}°C`;
        const maxValStr = isHumidity ? `${(maxTempResult as any).maxHumidity}%` : `${maxTempResult.maxTemp}°C`;
        const conclusionText = `Начало испытания: ${startTime.toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}.
Завершение испытания: ${endTime.toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}.
Длительность испытания: ${durationText}.
Зафиксированное минимальное значение: ${minValStr} в зоне измерения ${minTempResult.zoneNumber} на высоте ${minTempResult.measurementLevel} м.
Зафиксированное максимальное значение: ${maxValStr} в зоне измерения ${maxTempResult.zoneNumber} на высоте ${maxTempResult.measurementLevel} м.
Результаты испытания ${meetsLimits ? 'соответствуют' : 'не соответствуют'} заданному критерию приемлемости.`;

        setConclusions(conclusionText);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        testType: getTestTypeLabel(contractFields.testType) || ''
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Ошибка загрузки данных</h3>
        <p className="text-red-600">{error}</p>
        {onBack && (
          <button
            onClick={onBack}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Вернуться назад
          </button>
        )}
      </div>
    );
  }

  if (!data || data.points.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">Нет данных для анализа</h3>
        <p className="text-yellow-600">Загруженные файлы не содержат данных измерений.</p>
        {onBack && (
          <button
            onClick={onBack}
            className="mt-4 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Вернуться назад
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Chart */}
      <div ref={chartRef} className="bg-white rounded-lg shadow p-3 w-full">
        <div className="mb-2">
          <h3 className="text-lg font-semibold text-gray-900">
            График {dataType === 'temperature' ? 'температуры' : 'влажности'}
          </h3>
        </div>
        
        <TimeSeriesChart
          data={data.points}
          width={chartWidth}
          height={chartHeight}
          margin={chartMargin}
          dataType={dataType}
          limits={limits}
          markers={markers}
          zoomState={zoomState}
          onZoomChange={setZoomState}
          onMarkerAdd={handleAddMarker}
          yAxisLabel={dataType === 'temperature' ? 'Температура (°C)' : 'Влажность (%)'}
          yOffset={yOffset}
          resetLegendToken={legendResetKey}
          onHiddenLoggersChange={handleHiddenLoggersChange}
        />
      </div>

      {/* Test Information and Markers - always visible */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Испытания</h3>
        
        {/* Data Type Selection */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Тип данных</label>
              <div className="flex space-x-4">
                <button
                  onClick={() => setDataType('temperature')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    dataType === 'temperature'
                      ? 'bg-red-100 text-red-700 border border-red-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Thermometer className="w-4 h-4" />
                  <span>Температура</span>
                </button>
                {data && data.hasHumidity && (
                  <button
                    onClick={() => setDataType('humidity')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      dataType === 'humidity'
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Droplets className="w-4 h-4" />
                    <span>Влажность</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Limits */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Лимиты {dataType === 'temperature' ? 'температуры (°C)' : 'влажности (%)'}
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Минимум</label>
              <input
                type="number"
                step="0.1"
                value={limits[dataType]?.min ?? ''}
                onChange={(e) => handleLimitChange(dataType, 'min', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Не установлен"
                title="Минимальное значение"
                aria-label="Минимальное значение"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Максимум</label>
              <input
                type="number"
                step="0.1"
                value={limits[dataType]?.max ?? ''}
                onChange={(e) => handleLimitChange(dataType, 'max', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Не установлен"
                title="Максимальное значение"
                aria-label="Максимальное значение"
              />
            </div>
          </div>
        </div>
        
        {/* Contract Fields */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Тип испытания</label>
              <select
                value={contractFields.testType}
                onChange={(e) => handleContractFieldChange('testType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                title="Тип испытания"
                aria-label="Тип испытания"
              >
                <option value="">Выберите тип испытания</option>
                <option value="empty_volume">Испытание на соответствие критериям в пустом объеме</option>
                <option value="loaded_volume">Испытание на соответствие критериям в загруженном объеме</option>
                <option value="temperature_recovery">Испытание по восстановлению температуры после открытия двери</option>
                <option value="power_off">Испытание на сбой электропитания (отключение)</option>
                <option value="power_on">Испытание на сбой электропитания (включение)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Зоны хранения</label>
              <select
                value={selectedStorageZoneId}
                onChange={(e) => setSelectedStorageZoneId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                title="Зоны хранения"
                aria-label="Зоны хранения"
              >
                <option value="">Не выбрано</option>
                {(storageZones || []).map((zone) => {
                  const name = zone.name && zone.name.trim().length > 0 ? zone.name : 'Без наименования';
                  const volumeLabel = zone.volume !== undefined && zone.volume !== null ? ` (${zone.volume} м³)` : '';
                  return (
                    <option key={zone.id} value={zone.id}>
                      {name}{volumeLabel}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Управление масштабом</label>
              <button
                onClick={handleResetZoom}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors w-full"
              >
                Сбросить масштаб
              </button>
            </div>
            {contractFields.testType === 'temperature_recovery' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Критерий приемлемости (мин.)
                </label>
                <input
                  type="number"
                  min="0"
                  max="999"
                  step="1"
                  value={contractFields.acceptanceCriterion || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Валидация: только целые числа от 0 до 999
                    if (value === '' || (Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 999)) {
                      handleContractFieldChange('acceptanceCriterion', value);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Введите значение (0-999)"
                  title="Критерий приемлемости в минутах (целое число от 0 до 999)"
                  aria-label="Критерий приемлемости в минутах"
                />
              </div>
            )}
          </div>
        </div>

        {/* Markers section */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Маркеры времени</h4>
          {markers.length > 0 ? (
            <div className="space-y-2">
              {markers.map((marker) => (
                <div key={marker.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-3 flex-1">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: marker.color }}
                    ></div>
                    
                    <div className="flex flex-col space-y-1 flex-1">
                      <div className="flex items-center space-x-3">
                        {editingMarker === marker.id ? (
                          marker.type === 'power' ? (
                            <select
                              value={marker.label}
                              onChange={(e) => {
                                const newLabel = e.target.value;
                                setMarkers(prev => prev.map(m => 
                                  m.id === marker.id ? { ...m, label: newLabel } : m
                                ));
                              }}
                              onBlur={() => setEditingMarker(null)}
                              className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              autoFocus
                              title="Название маркера"
                              aria-label="Название маркера"
                              disabled={contractFields.testType === 'power_off' || contractFields.testType === 'power_on'}
                            >
                              {contractFields.testType === 'power_off' ? (
                                <option value="Отключение">Отключение</option>
                              ) : contractFields.testType === 'power_on' ? (
                                <option value="Включение">Включение</option>
                              ) : (
                                <>
                                  <option value="Отключение">Отключение</option>
                                  <option value="Включение">Включение</option>
                                </>
                              )}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={marker.label}
                              onChange={(e) => setMarkers(prev => 
                                prev.map(m => m.id === marker.id ? { ...m, label: e.target.value } : m)
                              )}
                              onBlur={() => setEditingMarker(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  setEditingMarker(null);
                                }
                              }}
                              className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              autoFocus
                              title="Название маркера"
                              aria-label="Название маркера"
                            />
                          )
                        ) : (
                          <span className="font-medium">{marker.label}</span>
                        )}
                        
                        {editingMarkerTimestamp === marker.id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="time"
                              value={new Date(marker.timestamp).toTimeString().slice(0, 5)}
                              onChange={(e) => {
                                const [hours, minutes] = e.target.value.split(':').map(Number);
                                const currentDate = new Date(marker.timestamp);
                                currentDate.setHours(hours, minutes, 0, 0);
                                const newTimestamp = currentDate.getTime();
                                if (!isNaN(newTimestamp)) {
                                  handleUpdateMarkerTimestamp(marker.id, newTimestamp);
                                }
                              }}
                              onWheel={(e) => {
                                e.preventDefault();
                                const delta = e.deltaY > 0 ? -1 : 1;
                                const currentDate = new Date(marker.timestamp);
                                const minutes = currentDate.getMinutes();
                                const hours = currentDate.getHours();
                                
                                // Определяем, что изменять: минуты или часы (в зависимости от того, зажат ли Shift)
                                if (e.shiftKey) {
                                  // Изменяем часы
                                  currentDate.setHours(hours + delta, minutes, 0, 0);
                                } else {
                                  // Изменяем минуты
                                  currentDate.setMinutes(minutes + delta, 0, 0);
                                }
                                
                                const newTimestamp = currentDate.getTime();
                                if (!isNaN(newTimestamp)) {
                                  handleUpdateMarkerTimestamp(marker.id, newTimestamp);
                                }
                              }}
                              onBlur={() => setEditingMarkerTimestamp(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === 'Escape') {
                                  setEditingMarkerTimestamp(null);
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  const currentDate = new Date(marker.timestamp);
                                  const minutes = currentDate.getMinutes();
                                  const hours = currentDate.getHours();
                                  if (e.shiftKey) {
                                    currentDate.setHours(hours + 1, minutes, 0, 0);
                                  } else {
                                    currentDate.setMinutes(minutes + 1, 0, 0);
                                  }
                                  const newTimestamp = currentDate.getTime();
                                  if (!isNaN(newTimestamp)) {
                                    handleUpdateMarkerTimestamp(marker.id, newTimestamp);
                                  }
                                } else if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  const currentDate = new Date(marker.timestamp);
                                  const minutes = currentDate.getMinutes();
                                  const hours = currentDate.getHours();
                                  if (e.shiftKey) {
                                    currentDate.setHours(hours - 1, minutes, 0, 0);
                                  } else {
                                    currentDate.setMinutes(minutes - 1, 0, 0);
                                  }
                                  const newTimestamp = currentDate.getTime();
                                  if (!isNaN(newTimestamp)) {
                                    handleUpdateMarkerTimestamp(marker.id, newTimestamp);
                                  }
                                }
                              }}
                              className="text-sm px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              autoFocus
                              title="Время маркера (часы:минуты). Скролл мыши для изменения, Shift+скролл для изменения часов"
                              aria-label="Время маркера"
                              step="60"
                            />
                            <span className="text-xs text-gray-400">
                              {new Date(marker.timestamp).toLocaleDateString('ru-RU', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        ) : (
                          <span 
                            className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 hover:underline"
                            onClick={() => setEditingMarkerTimestamp(marker.id)}
                            title="Нажмите для редактирования времени (часы:минуты)"
                          >
                            {new Date(marker.timestamp).toLocaleString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Тип:</span>
                        {contractFields.testType === 'power_off' || contractFields.testType === 'power_on' ? (
                          // Для фиксированных типов просто показываем текст
                          <span 
                            className="text-xs px-2 py-1 bg-white border border-gray-200 rounded cursor-default"
                            title={contractFields.testType === 'power_off'
                              ? 'Для типа испытания "Испытание на сбой электропитания (отключение)" доступны только маркеры типа "Электропитание" с наименованием "Отключение"'
                              : 'Для типа испытания "Испытание на сбой электропитания (включение)" доступны только маркеры типа "Электропитание" с наименованием "Включение"'}
                          >
                            {getMarkerTypeLabel(marker.type)}
                          </span>
                        ) : (
                          // Для типов с выбором используем переключатель
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateMarkerType(marker.id, 'test_start')}
                              className={`text-xs px-3 py-1 rounded transition-colors ${
                                marker.type === 'test_start'
                                  ? 'bg-blue-600 text-white font-medium'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                              title="Тип маркера: Начало испытания"
                            >
                              Начало испытания
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateMarkerType(marker.id, 'test_end')}
                              className={`text-xs px-3 py-1 rounded transition-colors ${
                                marker.type === 'test_end'
                                  ? 'bg-blue-600 text-white font-medium'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                              title="Тип маркера: Завершение испытания"
                            >
                              Завершение испытания
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateMarkerType(marker.id, 'door_opening')}
                              className={`text-xs px-3 py-1 rounded transition-colors ${
                                marker.type === 'door_opening'
                                  ? 'bg-blue-600 text-white font-medium'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                              title="Тип маркера: Открытие двери"
                            >
                              Открытие двери
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateMarkerType(marker.id, 'door_closing')}
                              className={`text-xs px-3 py-1 rounded transition-colors ${
                                marker.type === 'door_closing'
                                  ? 'bg-blue-600 text-white font-medium'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                              title="Тип маркера: Закрытие двери (не участвует в формировании выводов)"
                            >
                              Закрытие двери
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateMarkerType(marker.id, 'temperature_recovery')}
                              className={`text-xs px-3 py-1 rounded transition-colors ${
                                marker.type === 'temperature_recovery'
                                  ? 'bg-blue-600 text-white font-medium'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                              title="Тип маркера: Восстановление температуры"
                            >
                              Восстановление температуры
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateMarkerType(marker.id, 'power_off_event')}
                              className={`text-xs px-3 py-1 rounded transition-colors ${
                                marker.type === 'power_off_event'
                                  ? 'bg-blue-600 text-white font-medium'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                              title="Тип маркера: Питание выключено (не участвует в формировании Результатов анализа и Выводов)"
                            >
                              Питание выключено
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateMarkerType(marker.id, 'power_on_event')}
                              className={`text-xs px-3 py-1 rounded transition-colors ${
                                marker.type === 'power_on_event'
                                  ? 'bg-blue-600 text-white font-medium'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                              title="Тип маркера: Питание включено (не участвует в формировании Результатов анализа и Выводов)"
                            >
                              Питание включено
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        if (editingMarkerTimestamp === marker.id) {
                          setEditingMarkerTimestamp(null);
                        } else {
                          setEditingMarkerTimestamp(marker.id);
                        }
                      }}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="Редактировать дату и время"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingMarker(marker.id)}
                      className="text-indigo-600 hover:text-indigo-800 transition-colors"
                      title="Редактировать название"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMarker(marker.id)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                      title="Удалить маркер"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
              <p className="text-sm">Маркеры не добавлены</p>
              <p className="text-xs mt-1">Сделайте двойной клик по графику для добавления маркера</p>
              <div className="text-xs mt-2 space-y-1">
                <p><strong>Типы маркеров:</strong></p>
                <div className="flex justify-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span>Испытание</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span>Открытие двери</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded-full bg-black"></div>
                    <span>Электропитание</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Объединенный блок Результаты анализа и Выводы */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Результаты анализа и Выводы</h3>
          {contractFields.testType && (
            <button
              onClick={handleAutoFillConclusions}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Заполнить
            </button>
          )}
        </div>
        
        {showAnalysisResults ? (
          <>
            {/* Analysis Results Table - условный рендеринг в зависимости от типа испытания */}
            {(() => {
              const testType = contractFields.testType;
        
        // Стандартная таблица для empty_volume и loaded_volume
        if (testType === 'empty_volume' || testType === 'loaded_volume') {
          const isHumidity = dataType === 'humidity';

          // Для температуры: отклонение от среднего значения диапазона (колонка только для температуры)
          const limitMin = limits.temperature?.min;
          const limitMax = limits.temperature?.max;
          const hasLimits = typeof limitMin === 'number' && typeof limitMax === 'number';
          const limitCenter = hasLimits ? (limitMin + limitMax) / 2 : null;
          const limitCenterLabel = hasLimits && limitCenter !== null
            ? (Math.round(limitCenter * 10) / 10).toString().replace('.', ',')
            : 'X';
          const getDeviationValue = (value: string, isExternal: boolean) => {
            if (isExternal || !hasLimits || limitCenter === null) {
              return null;
            }
            const parsed = parseFloat(value);
            if (isNaN(parsed)) {
              return null;
            }
            return Math.abs(parsed - limitCenter);
          };
          const formatDeviation = (value: string, isExternal: boolean) => {
            const deviation = getDeviationValue(value, isExternal);
            if (deviation === null) {
              return '-';
            }
            return (Math.round(deviation * 10) / 10).toString().replace('.', ',');
          };
          const deviationMinValues = visibleAnalysisResults
            .map((result) => getDeviationValue(result.minTemp, result.isExternal))
            .filter((val): val is number => val !== null);
          const deviationMaxValues = visibleAnalysisResults
            .map((result) => getDeviationValue(result.maxTemp, result.isExternal))
            .filter((val): val is number => val !== null);
          const maxDeviationMin = deviationMinValues.length > 0 ? Math.max(...deviationMinValues) : null;
          const maxDeviationMax = deviationMaxValues.length > 0 ? Math.max(...deviationMaxValues) : null;

          // Соответствие критериям для влажности (по лимитам влажности)
          const getMeetsLimitsHumidity = (result: (typeof visibleAnalysisResults)[0]) => {
            if (result.isExternal) return '-';
            const minH = (result as any).minHumidity;
            const maxH = (result as any).maxHumidity;
            if (minH === '-' || maxH === '-') return '-';
            const hMin = limits.humidity?.min;
            const hMax = limits.humidity?.max;
            if (hMin === undefined && hMax === undefined) return '-';
            const minVal = parseFloat(minH);
            const maxVal = parseFloat(maxH);
            if (isNaN(minVal) || isNaN(maxVal)) return '-';
            const okMin = hMin === undefined || minVal >= hMin;
            const okMax = hMax === undefined || maxVal <= hMax;
            return (okMin && okMax) ? 'Да' : 'Нет';
          };

          if (isHumidity) {
            // Таблица для типа данных «Влажность»: Мин. ОВ %, Макс. ОВ %, Среднее ОВ %; без колонки отклонения
            return (
              <>
              <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      № зоны измерения
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Уровень измерения (м.)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Наименование логгера
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Серийный № логгера
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Мин. ОВ %
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Макс. ОВ %
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Среднее ОВ %
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Соответствие критериям
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {visibleAnalysisResults.map((result, index) => {
                    const minH = (result as any).minHumidity ?? '-';
                    const maxH = (result as any).maxHumidity ?? '-';
                    const avgH = (result as any).avgHumidity ?? '-';
                    const minVal = typeof minH === 'string' ? parseFloat(minH) : NaN;
                    const maxVal = typeof maxH === 'string' ? parseFloat(maxH) : NaN;
                    const meetsLimitsH = getMeetsLimitsHumidity(result);
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {result.zoneNumber === 'Внешний' || result.zoneNumber === '0' ? 'Внешняя влажность' : result.zoneNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {result.measurementLevel === '-' ? '-' : parseFloat(result.measurementLevel).toFixed(1).replace('.', ',')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {result.loggerName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {result.serialNumber}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center ${
                          !result.isExternal && !isNaN(minVal) &&
                          globalMinHumidity !== null && minVal === globalMinHumidity
                            ? 'bg-blue-200'
                            : ''
                        }`}>
                          {minH}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center ${
                          !result.isExternal && !isNaN(maxVal) &&
                          globalMaxHumidity !== null && maxVal === globalMaxHumidity
                            ? 'bg-red-200'
                            : ''
                        }`}>
                          {maxH}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          {avgH === '-' || !avgH ? '-' : parseFloat(avgH).toFixed(1).replace('.', ',')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            meetsLimitsH === 'Да'
                              ? 'bg-green-100 text-green-800'
                              : meetsLimitsH === 'Нет'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {meetsLimitsH}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Обозначения:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-200 rounded"></div>
                  <span>Минимальное значение ОВ в выбранном периоде</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-200 rounded"></div>
                  <span>Максимальное значение ОВ в выбранном периоде</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Да</span>
                  <span>Соответствует лимитам</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Нет</span>
                  <span>Не соответствует лимитам</span>
                </div>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-600">
              <strong>Примечание:</strong> При изменении масштаба графика статистика пересчитывается только для выбранного временного периода.
            </div>
            </>
            );
          }

          // Таблица для типа данных «Температура» (с колонкой отклонения)
          return (
            <>
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" rowSpan={2}>
                    № зоны измерения
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" rowSpan={2}>
                    Уровень измерения (м.)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" rowSpan={2}>
                    Наименование логгера
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" rowSpan={2}>
                    Серийный № логгера
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" rowSpan={2}>
                    Мин. t°C
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" rowSpan={2}>
                    Макс. t°C
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" rowSpan={2}>
                    Среднее t°C
                  </th>
                  <th
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    colSpan={2}
                  >
                    {`Отклонение от среднего значения (${limitCenterLabel}°C) установленного диапазона (по модулю)`}
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" rowSpan={2}>
                    Соответствие критериям
                  </th>
                </tr>
                <tr>
                  <th className="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Мин.
                  </th>
                  <th className="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Макс.
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visibleAnalysisResults.map((result, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {result.zoneNumber === 'Внешний' || result.zoneNumber === '0' ? 'Внешняя температура' : result.zoneNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {result.measurementLevel === '-' ? '-' : parseFloat(result.measurementLevel).toFixed(1).replace('.', ',')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {result.loggerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {result.serialNumber}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center ${
                      !result.isExternal && !isNaN(parseFloat(result.minTemp)) && 
                      globalMinTemp !== null && parseFloat(result.minTemp) === globalMinTemp
                        ? 'bg-blue-200' 
                        : ''
                    }`}>
                      {result.minTemp}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center ${
                      !result.isExternal && !isNaN(parseFloat(result.maxTemp)) && 
                      globalMaxTemp !== null && parseFloat(result.maxTemp) === globalMaxTemp
                        ? 'bg-red-200' 
                        : ''
                    }`}>
                      {result.maxTemp}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {result.avgTemp === '-' || !result.avgTemp ? '-' : parseFloat(result.avgTemp).toFixed(1).replace('.', ',')}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center ${
                      maxDeviationMin !== null &&
                      getDeviationValue(result.minTemp, result.isExternal) === maxDeviationMin
                        ? 'bg-gray-300'
                        : ''
                    }`}>
                      {formatDeviation(result.minTemp, result.isExternal)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center ${
                      maxDeviationMax !== null &&
                      getDeviationValue(result.maxTemp, result.isExternal) === maxDeviationMax
                        ? 'bg-gray-300'
                        : ''
                    }`}>
                      {formatDeviation(result.maxTemp, result.isExternal)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        result.meetsLimits === 'Да' 
                          ? 'bg-green-100 text-green-800' 
                          : result.meetsLimits === 'Нет'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {result.meetsLimits}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Обозначения:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-200 rounded"></div>
                <span>Минимальное значение в выбранном периоде</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-200 rounded"></div>
                <span>Максимальное значение в выбранном периоде</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  Да
                </span>
                <span>Соответствует лимитам</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                  Нет
                </span>
                <span>Не соответствует лимитам</span>
              </div>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-600">
            <strong>Примечание:</strong> При изменении масштаба графика статистика пересчитывается только для выбранного временного периода.
          </div>
          </>
          );
        }
        
        // Таблица для power_off: Испытание на сбой электропитания (отключение)
        if (testType === 'power_off') {
          return (
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
                    Номер логгера
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Серийный № логгера
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Питание отключено. Время, в течение которого температура находится в требуемом диапазоне, (час: мин)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visibleAnalysisResults.map((result, index) => {
                  const isExternal = result.isExternal || result.zoneNumber === 'Внешний' || result.zoneNumber === '0';
                  const testMarker = getTestMarker();
                  const zoneNumber = result.zoneNumberRaw !== undefined ? result.zoneNumberRaw : (result.zoneNumber === 'Внешний' || result.zoneNumber === '0' ? 0 : parseInt(result.zoneNumber.toString()) || 0);
                  
                  // Для внешних датчиков не рассчитываем время
                  let timeInRange = '-';
                  if (!isExternal && testMarker && limits.temperature) {
                    // Фильтруем точки по зоне и уровню, учитывая выделенный диапазон (zoomState)
                    let filePoints = data?.points.filter(p => {
                      const pZone = p.zoneNumber !== null && p.zoneNumber !== undefined ? p.zoneNumber : 0;
                      const pLevel = p.measurementLevel?.toString() || 'unknown';
                      return `${pZone}_${pLevel}` === `${zoneNumber}_${result.measurementLevel.toString()}`;
                    }) || [];
                    
                    // Если есть выделенный диапазон (zoomState), используем только эти данные
                    if (zoomState) {
                      filePoints = filePoints.filter(p => 
                        p.timestamp >= zoomState.startTime && p.timestamp <= zoomState.endTime
                      );
                    }
                    
                    timeInRange = calculateTimeInRangeAfterPowerOff(
                      filePoints,
                      testMarker.timestamp,
                      limits.temperature.min,
                      limits.temperature.max
                    );
                  }
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {result.zoneNumber === 'Внешний' || result.zoneNumber === '0' ? 'Внешняя температура' : result.zoneNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.measurementLevel === '-' ? '-' : parseFloat(result.measurementLevel).toFixed(1).replace('.', ',')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.loggerName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.serialNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {timeInRange}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          );
        }
        
        // Таблица для power_on: Испытание на сбой электропитания (включение)
        if (testType === 'power_on') {
          return (
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
                    Номер логгера
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Серийный № логгера
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Питание включено. Время восстановления до требуемого диапазона температур, (час: мин)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visibleAnalysisResults.map((result, index) => {
                  const isExternal = result.isExternal || result.zoneNumber === 'Внешний' || result.zoneNumber === '0';
                  const testMarker = getTestMarker();
                  const zoneNumber = result.zoneNumberRaw !== undefined ? result.zoneNumberRaw : (result.zoneNumber === 'Внешний' || result.zoneNumber === '0' ? 0 : parseInt(String(result.zoneNumber)) || 0);
                  const resultLevel = typeof result.measurementLevel === 'string' ? result.measurementLevel : String(result.measurementLevel || 'unknown');
                  
                  // Для внешних датчиков не рассчитываем время
                  let recoveryTime = '-';
                  if (!isExternal && testMarker && limits.temperature) {
                    // Фильтруем точки по зоне и уровню, учитывая выделенный диапазон (zoomState)
                    let filePoints = data?.points.filter(p => {
                      const pZone = p.zoneNumber !== null && p.zoneNumber !== undefined ? p.zoneNumber : 0;
                      const pLevel = p.measurementLevel?.toString() || 'unknown';
                      return `${pZone}_${pLevel}` === `${zoneNumber}_${resultLevel}`;
                    }) || [];
                    
                    // Если есть выделенный диапазон (zoomState), используем только эти данные
                    if (zoomState) {
                      filePoints = filePoints.filter(p => 
                        p.timestamp >= zoomState.startTime && p.timestamp <= zoomState.endTime
                      );
                    }
                    
                    recoveryTime = calculateRecoveryTimeAfterPowerOn(
                      filePoints,
                      testMarker.timestamp,
                      limits.temperature.min,
                      limits.temperature.max
                    );
                  }
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {result.zoneNumber === 'Внешний' || result.zoneNumber === '0' ? 'Внешняя температура' : result.zoneNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.measurementLevel === '-' ? '-' : parseFloat(result.measurementLevel).toFixed(1).replace('.', ',')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.loggerName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.serialNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {recoveryTime}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          );
        }
        
        // Таблица для temperature_recovery: Испытание по восстановлению температуры после открытия двери
        if (testType === 'temperature_recovery') {
          return (
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
                    Номер логгера
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Серийный № логгера
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Время восстановления до заданного диапазона температур, (час: мин)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Соответствует критерию
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visibleAnalysisResults.map((result, index) => {
                  const isExternal = result.isExternal || result.zoneNumber === 'Внешний' || result.zoneNumber === '0';
                  const zoneNumber = result.zoneNumberRaw !== undefined ? result.zoneNumberRaw : (result.zoneNumber === 'Внешний' || result.zoneNumber === '0' ? 0 : parseInt(String(result.zoneNumber)) || 0);
                  const resultLevel = typeof result.measurementLevel === 'string' ? result.measurementLevel : String(result.measurementLevel || 'unknown');
                  
                  // Для внешних датчиков не рассчитываем время и соответствие критерию
                  let recoveryData = { time: '-', meetsCriterion: '-' };
                  
                  if (!isExternal && limits.temperature) {
                    const filePoints = data?.points.filter(p => {
                      const pZone = p.zoneNumber !== null && p.zoneNumber !== undefined ? p.zoneNumber : 0;
                      const pLevel = p.measurementLevel?.toString() || 'unknown';
                      return `${pZone}_${pLevel}` === `${zoneNumber}_${resultLevel}`;
                    }) || [];
                    
                    // Получаем маркеры в последовательности: Открытие двери -> Закрытие двери -> Восстановление температуры
                    const doorMarkers = markers.filter(m => 
                      m.type === 'door_opening' || m.type === 'door_closing' || m.type === 'temperature_recovery'
                    ).sort((a, b) => a.timestamp - b.timestamp);
                    
                    recoveryData = calculateRecoveryTimeAfterDoorOpening(
                      filePoints,
                      doorMarkers,
                      limits.temperature.min,
                      limits.temperature.max
                    );
                  }
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {result.zoneNumber === 'Внешний' || result.zoneNumber === '0' ? 'Внешняя температура' : result.zoneNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.measurementLevel === '-' ? '-' : parseFloat(result.measurementLevel).toFixed(1).replace('.', ',')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.loggerName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.serialNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {recoveryData.time}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          recoveryData.meetsCriterion === 'Да' 
                            ? 'bg-green-100 text-green-800' 
                            : recoveryData.meetsCriterion === 'Нет'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {recoveryData.meetsCriterion}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          );
        }
        
              // Если тип испытания не выбран или не соответствует ни одному из типов, не показываем таблицу
              return null;
            })()}

            {/* Поле для выводов */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Выводы
              </label>
              <textarea
                value={conclusions}
                onChange={(e) => setConclusions(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                rows={4}
                placeholder="Введите выводы по результатам анализа..."
              />
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm mb-4">Нажмите кнопку "Заполнить" для отображения результатов анализа и выводов</p>
          </div>
        )}
      </div>

      {/* Кнопка формирования отчета */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col items-center space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 text-center">
            Формирование приложения к отчету с результатами испытаний
          </h2>
          
          {/* Шаблон из справочника объектов квалификации */}
          <div className="w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-700 mb-4 text-center">
              Шаблон отчета из справочника объектов квалификации
            </h3>
            
            {(() => {
              console.log('🔍 Проверка состояния шаблона:', {
                hasTemplateFile: !!reportStatus.templateFile,
                templateFileName: reportStatus.templateFile?.name,
                templateFromDirectoryLoading: templateFromDirectory.loading,
                templateFromDirectoryError: templateFromDirectory.error,
                templateFromDirectoryLoaded: templateFromDirectory.loaded,
                templateValidation: reportStatus.templateValidation
              });
              return null;
            })()}
            
            {reportStatus.templateFile ? (
              // Показываем загруженный шаблон (из справочника или вручную)
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-green-600" />
                    <div>
                      <span className="text-sm font-medium text-gray-900 block">
                        {reportStatus.templateFile.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {templateFromDirectory.loaded 
                          ? 'Загружен из справочника объектов квалификации'
                          : 'Загружен вручную'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveTemplate}
                    className="text-red-600 hover:text-red-800 transition-colors"
                    title="Удалить шаблон"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Результат валидации */}
                {reportStatus.templateValidation && (
                  <div className={`mt-2 p-2 rounded text-xs ${
                    reportStatus.templateValidation.isValid 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {reportStatus.templateValidation.isValid ? (
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>Шаблон валиден</span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center space-x-1 mb-1">
                          <XCircle className="w-3 h-3" />
                          <span>Ошибки в шаблоне:</span>
                        </div>
                        <ul className="list-disc list-inside ml-4">
                          {reportStatus.templateValidation.errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : templateFromDirectory.loading ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <span className="text-sm text-gray-600">
                  Загрузка шаблона из справочника...
                </span>
              </div>
            ) : templateFromDirectory.error ? (
              <div className="border-2 border-dashed border-red-300 rounded-lg p-6 text-center bg-red-50">
                <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <span className="text-sm text-red-600 mb-2 block">
                  {templateFromDirectory.error}
                </span>
                <span className="text-xs text-gray-500">
                  Вы можете загрузить шаблон вручную
                </span>
                <div className="mt-4">
                  <input
                    type="file"
                    accept=".docx"
                    onChange={handleTemplateUpload}
                    className="hidden"
                    id="template-upload-fallback"
                    title="Загрузить DOCX шаблон"
                    aria-label="Загрузить DOCX шаблон"
                  />
                  <label
                    htmlFor="template-upload-fallback"
                    className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Загрузить шаблон вручную
                  </label>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".docx"
                  onChange={handleTemplateUpload}
                  className="hidden"
                  id="template-upload"
                  title="Загрузить DOCX шаблон"
                  aria-label="Загрузить DOCX шаблон"
                />
                <label
                  htmlFor="template-upload"
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  <FileText className="w-8 h-8 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Загрузить DOCX шаблон вручную
                  </span>
                  <span className="text-xs text-gray-500">
                    Должен содержать плейсхолдер {'{chart}'} для вставки графика
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Кнопки генерации отчетов */}
          <div className="flex justify-center gap-4 flex-wrap">
            <button
              onClick={handleGenerateTemplateReport}
              disabled={Boolean(
                reportStatus.isGenerating || 
                !reportStatus.templateFile || 
                (reportStatus.templateValidation && !reportStatus.templateValidation.isValid) ||
                !showAnalysisResults ||
                analysisResults.length === 0 ||
                !conclusions.trim()
              )}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 text-lg font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              title={
                !showAnalysisResults || analysisResults.length === 0 || !conclusions.trim()
                  ? "Необходимо заполнить блоки 'Результаты анализа' и 'Выводы'"
                  : "Сформировать отчет по загруженному шаблону"
              }
            >
              {reportStatus.isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Формирование отчета...</span>
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  <span>Сформировать приложение о испытаниях</span>
                </>
              )}
            </button>
            <button
              onClick={handleGenerateVerificationReport}
              disabled={verificationReportStatus.isGenerating || !projectId || !qualificationObjectId}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 text-lg font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              title="Сформировать приложение свидетельства о поверке"
            >
              {verificationReportStatus.isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Формирование...</span>
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  <span>Сформировать приложение свидетельства о поверке</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Секция сохраненных отчетов */}
        {projectId && qualificationObjectId && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-indigo-600" />
              Приложения к отчету
            </h3>
            
            {loadingReports ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Загрузка отчетов...</p>
              </div>
            ) : savedReports.length > 0 ? (
              <div className="space-y-3">
                {savedReports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-gray-600" />
                        <span className="font-medium text-gray-900">{report.reportName}</span>
                        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                          {report.reportType === 'template' ? 'По шаблону' : 'Анализ'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Создан: {report.createdAt.toLocaleDateString('ru-RU')} в {report.createdAt.toLocaleTimeString('ru-RU')}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDownloadSavedReport(report)}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="Скачать отчет"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSavedReport(report.id!)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="Удалить отчет"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Сохраненных отчетов пока нет</p>
                <p className="text-sm">Создайте отчет, чтобы он появился здесь</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Отладочная информация */}
      {canViewDebugInfo && <div className="bg-white rounded-lg shadow">
        <button
          onClick={() => setDebugInfoOpen(!debugInfoOpen)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
        >
          <h3 className="text-lg font-semibold text-gray-900">Отладочная информация</h3>
          {debugInfoOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>
        
        {debugInfoOpen && (
          <div className="p-6 border-t border-gray-200 space-y-4">
            <div className="flex items-center justify-end">
              <button
                onClick={handleInvestigate}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                title="Сформировать XLSX по данным графика"
              >
                Исследовать
              </button>
            </div>
            {/* Отладочная информация */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">qualificationObjectId:</span>
                <span className="ml-2 font-mono text-xs text-gray-900 break-all">{qualificationObjectId || 'Не указан'}</span>
              </div>
              <div>
                <span className="text-gray-600">projectId:</span>
                <span className="ml-2 font-mono text-xs text-gray-900 break-all">{projectId || 'Не указан'}</span>
              </div>
              <div>
                <span className="text-gray-600">fullProject:</span>
                <span className="ml-2 text-gray-900">{debugInfo.fullProject}</span>
              </div>
              <div>
                <span className="text-gray-600">contractor:</span>
                <span className="ml-2 text-gray-900">{debugInfo.contractor}</span>
              </div>
              <div>
                <span className="text-gray-600">loggerCount:</span>
                <span className="ml-2 text-gray-900">{debugInfo.loggerCount}</span>
              </div>
              <div>
                <span className="text-gray-600">measurementZones:</span>
                <span className="ml-2 text-gray-900">{debugInfo.measurementZones}</span>
              </div>
            </div>
            
            {/* Смещение по оси Y */}
            <div className="flex items-center justify-center space-x-2 pt-4 border-t border-gray-200">
              <button
                onClick={() => setYOffset(prev => prev + 0.1)}
                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                title="Увеличить смещение на +0.1"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-gray-900 min-w-[3rem] text-center">
                {yOffset > 0 ? `+${yOffset.toFixed(1)}` : yOffset.toFixed(1)}
              </span>
              <button
                onClick={() => setYOffset(prev => prev - 0.1)}
                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                title="Уменьшить смещение на -0.1"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
              <button
                onClick={() => setYOffset(0)}
                className="ml-4 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                title="Сбросить смещение"
              >
                Сбросить
              </button>
            </div>
          </div>
        )}
      </div>}
    </div>
  );
};