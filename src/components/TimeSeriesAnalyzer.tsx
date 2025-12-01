import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Settings, Plus, Trash2, Edit2, Save, X, BarChart, Thermometer, Droplets, Download, FileText, ExternalLink, XCircle, CheckCircle } from 'lucide-react';
import { UploadedFile } from '../types/FileData';
import { TimeSeriesChart } from './TimeSeriesChart';
import { useTimeSeriesData } from '../hooks/useTimeSeriesData';
import { ChartLimits, VerticalMarker, ZoomState, DataType, MarkerType, TimeSeriesPoint } from '../types/TimeSeriesData';
import { useAuth } from '../contexts/AuthContext';
import html2canvas from 'html2canvas';
import { DocxTemplateProcessor, TemplateReportData } from '../utils/docxTemplateProcessor';
import { reportService, ReportData } from '../utils/reportService';
import { qualificationObjectService } from '../utils/qualificationObjectService';
import { qualificationObjectTypeService } from '../utils/qualificationObjectTypeService';
import PizZip from 'pizzip';

interface TimeSeriesAnalyzerProps {
  files: UploadedFile[];
  onBack?: () => void;
  qualificationObjectId?: string;
  projectId?: string;
}

export const TimeSeriesAnalyzer: React.FC<TimeSeriesAnalyzerProps> = ({ files, onBack, qualificationObjectId, projectId }) => {
  const { user } = useAuth();
  const { data, loading, error } = useTimeSeriesData({ 
    files, 
    qualificationObjectId, 
    projectId 
  });

  // Отладочная информация
  console.log('TimeSeriesAnalyzer: props:', { files, qualificationObjectId, projectId });
  console.log('TimeSeriesAnalyzer: data:', data);
  console.log('TimeSeriesAnalyzer: loading:', loading);
  console.log('TimeSeriesAnalyzer: error:', error);
  
  // Chart settings
  const [dataType, setDataType] = useState<DataType>('temperature');
  const [limits, setLimits] = useState<ChartLimits>({});
  const [markers, setMarkers] = useState<VerticalMarker[]>([]);
  const [zoomState, setZoomState] = useState<ZoomState | undefined>();
  
  // Contract fields
  const [contractFields, setContractFields] = useState({
    testType: '',
    acceptanceCriterion: '' // Критерий приемлемости (мин.) для temperature_recovery
  });
  
  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [editingMarker, setEditingMarker] = useState<string | null>(null);
  const [editingMarkerType, setEditingMarkerType] = useState<string | null>(null);
  const [editingMarkerTimestamp, setEditingMarkerTimestamp] = useState<string | null>(null);
  const [conclusions, setConclusions] = useState('');
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
        const obj = await qualificationObjectService.getQualificationObjectById(qualificationObjectId);
        console.log('Загружен объект квалификации с зонами:', obj);
        setQualificationObject(obj);
      } catch (error) {
        console.error('Ошибка загрузки объекта квалификации:', error);
      }
    };

    loadQualificationObject();
  }, [qualificationObjectId]);

  // Загрузка шаблона из справочника объектов квалификации
  useEffect(() => {
    const loadTemplateFromDirectory = async () => {
      if (!qualificationObjectId) {
        return;
      }

      setTemplateFromDirectory(prev => ({ ...prev, loading: true, error: null }));

      try {
        // 1. Загружаем объект квалификации
        const qualificationObject = await qualificationObjectService.getQualificationObjectById(qualificationObjectId);
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

  // Generate analysis results table data
  const analysisResults = useMemo(() => {
    console.log('TimeSeriesAnalyzer: analysisResults useMemo called', { 
      hasData: !!data, 
      pointsLength: data?.points?.length || 0,
      filesLength: files.length,
      qualificationObjectId,
      projectId,
      hasQualificationObject: !!qualificationObject,
      measurementZonesCount: qualificationObject?.measurementZones?.length || 0,
      testType: contractFields.testType,
      markersCount: markers.length
    });
    
    if (!data || !data.points.length) {
      console.log('TimeSeriesAnalyzer: No data or points, returning empty array');
      return [];
    }

    // Фильтруем данные по времени если применен зум
    let filteredPoints = data.points;
    if (zoomState) {
      filteredPoints = data.points.filter(point => 
        point.timestamp >= zoomState.startTime && point.timestamp <= zoomState.endTime
      );
    }

    // Для типов empty_volume и loaded_volume фильтруем данные по маркерам типа "Испытание"
    if (contractFields.testType === 'empty_volume' || contractFields.testType === 'loaded_volume') {
      // Находим все маркеры типа "test"
      const testMarkers = markers.filter(m => m.type === 'test');
      
      console.log('TimeSeriesAnalyzer: Processing test markers', {
        testMarkersCount: testMarkers.length,
        allMarkers: markers.map(m => ({ id: m.id, type: m.type, label: m.label, timestamp: m.timestamp }))
      });
      
      // Если маркеры типа 'test' не найдены или найден только один - используем все данные
      if (testMarkers.length === 0 || testMarkers.length === 1) {
        console.log('TimeSeriesAnalyzer: No test markers or single marker, using all data', {
          testMarkersCount: testMarkers.length
        });
        // filteredPoints уже содержит все данные (с учетом зума)
      } else {
        // Находим все пары "Начало испытания" - "Завершение испытания"
        const startMarkers = testMarkers
          .filter(m => m.label && m.label.trim() === 'Начало испытания')
          .sort((a, b) => a.timestamp - b.timestamp);
        const endMarkers = testMarkers
          .filter(m => m.label && m.label.trim() === 'Завершение испытания')
          .sort((a, b) => a.timestamp - b.timestamp);
        
        // Находим маркеры "Открытие двери" для исключения
        const doorMarkers = markers
          .filter(m => m.type === 'door_opening')
          .sort((a, b) => a.timestamp - b.timestamp);
        
        console.log('TimeSeriesAnalyzer: Found marker pairs', {
          startMarkersCount: startMarkers.length,
          endMarkersCount: endMarkers.length,
          doorMarkersCount: doorMarkers.length
        });
        
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
          
          console.log('TimeSeriesAnalyzer: Created ranges', {
            rangesCount: ranges.length,
            ranges: ranges.map(r => ({ start: r.start, end: r.end }))
          });
          
          if (ranges.length > 0) {
            // Фильтруем точки, которые попадают в любой из диапазонов
            // и не попадают в диапазоны между маркерами "Открытие двери"
            filteredPoints = filteredPoints.filter(point => {
              // Проверяем, попадает ли точка в какой-либо диапазон испытания
              const inTestRange = ranges.some(range => 
                point.timestamp >= range.start && point.timestamp <= range.end
              );
              
              if (!inTestRange) {
                return false;
              }
              
              // Если точка в диапазоне испытания, проверяем, не попадает ли она в диапазон между маркерами "Открытие двери"
              // Исключаем данные между парами маркеров "Открытие двери" внутри диапазона испытания
              for (let i = 0; i < doorMarkers.length - 1; i += 2) {
                const doorStart = doorMarkers[i].timestamp;
                const doorEnd = doorMarkers[i + 1]?.timestamp;
                
                if (doorEnd && point.timestamp >= doorStart && point.timestamp <= doorEnd) {
                  // Проверяем, что этот диапазон двери находится внутри диапазона испытания
                  const inTestRangeWithDoor = ranges.some(range => 
                    doorStart >= range.start && doorEnd <= range.end
                  );
                  
                  if (inTestRangeWithDoor) {
                    return false; // Исключаем точку, если она в диапазоне открытия двери внутри испытания
                  }
                }
              }
              
              return true;
            });
            
            console.log('TimeSeriesAnalyzer: Filtered by marker ranges', {
              rangesCount: ranges.length,
              doorMarkersCount: doorMarkers.length,
              filteredCount: filteredPoints.length
            });
          } else {
            // Если не удалось сформировать пары, используем все данные
            console.log('TimeSeriesAnalyzer: Could not form marker pairs, using all data');
          }
        } else {
          // Если не найдены пары "Начало испытания" - "Завершение испытания", используем все данные
          console.log('TimeSeriesAnalyzer: No start/end marker pairs found, using all data');
        }
      }
    }

    // Если есть данные из базы данных (qualificationObjectId и projectId), используем их
    if (qualificationObjectId && projectId) {
      console.log('TimeSeriesAnalyzer: Generating analysis results from database data');
      
      // Группируем точки по zone_number и measurement_level
      const groupedPoints = filteredPoints.reduce((acc, point) => {
        const key = `${point.zoneNumber || 'unknown'}_${point.measurementLevel || 'unknown'}`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(point);
        return acc;
      }, {} as Record<string, typeof filteredPoints>);

      console.log('TimeSeriesAnalyzer: Grouped points:', Object.keys(groupedPoints).length, 'groups');

      return Object.entries(groupedPoints).map(([key, points]) => {
        // Нормализуем zoneNumber: null/undefined -> 0 (зона "Внешний датчик")
        const zoneNumber = points[0]?.zoneNumber !== null && points[0]?.zoneNumber !== undefined 
          ? points[0].zoneNumber 
          : 0;
        
        // Нормализуем measurementLevel: null/undefined -> 'unknown'
        const measurementLevel = points[0]?.measurementLevel !== null && points[0]?.measurementLevel !== undefined
          ? points[0].measurementLevel
          : 'unknown';
        
        // Calculate temperature statistics
        const temperatures = points
          .filter(p => p.temperature !== undefined && p.temperature !== null && !isNaN(p.temperature) && isFinite(p.temperature))
          .map(p => p.temperature!);
        
        console.log(`TimeSeriesAnalyzer: Processing zone ${zoneNumber} level ${measurementLevel}`, {
          totalPoints: points.length,
          validTemperaturePoints: temperatures.length,
          sampleTemps: temperatures.slice(0, 5)
        });
        
        const humidities = points
          .filter(p => p.humidity !== undefined && p.humidity !== null)
          .map(p => p.humidity!);

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

        return {
          zoneNumber: zoneNumber === 0 ? 'Внешний' : (zoneNumber !== null && zoneNumber !== undefined ? zoneNumber.toString() : 'Неизвестно'),
          zoneNumberRaw: zoneNumber, // Сохраняем исходный номер для сортировки
          measurementLevel: measurementLevel !== null && measurementLevel !== undefined ? measurementLevel.toString() : 'Неизвестно',
          loggerName: loggerName,
          serialNumber: (points[0]?.serialNumber && !points[0]?.serialNumber.startsWith('XLS-Logger-')) ? points[0]?.serialNumber : 'Не указан',
          minTemp: tempStats.min,
          maxTemp: tempStats.max,
          avgTemp: tempStats.avg,
          minHumidity: humidityStats.min,
          maxHumidity: humidityStats.max,
          avgHumidity: humidityStats.avg,
          meetsLimits,
          isExternal: zoneNumber === 0
        };
      }).sort((a, b) => {
        // Сортируем: сначала зоны от 1 и выше (по возрастанию), затем зона 0 (Внешний) в конце
        if (a.zoneNumberRaw === 0 && b.zoneNumberRaw === 0) return 0;
        if (a.zoneNumberRaw === 0) return 1; // Зона 0 всегда в конце
        if (b.zoneNumberRaw === 0) return -1; // Зона 0 всегда в конце
        return a.zoneNumberRaw - b.zoneNumberRaw; // Остальные зоны по возрастанию
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
        
        return {
          zoneNumber: file.zoneNumber === 0 ? 'Внешний' : (file.zoneNumber || '-'),
          zoneNumberRaw: file.zoneNumber || 0, // Сохраняем исходный номер для сортировки
          measurementLevel: file.measurementLevel || '-',
          loggerName: loggerName,
          serialNumber: (file.parsedData?.deviceMetadata?.serialNumber && !file.parsedData?.deviceMetadata?.serialNumber.startsWith('XLS-Logger-')) ? file.parsedData?.deviceMetadata?.serialNumber : 'Не указан',
          minTemp: '-',
          maxTemp: '-',
          avgTemp: '-',
          minHumidity: '-',
          maxHumidity: '-',
          avgHumidity: '-',
          meetsLimits: '-',
          isExternal: file.zoneNumber === 0
        };
      }

      // Calculate temperature statistics
      const temperatures = filePoints
        .filter(p => p.temperature !== undefined)
        .map(p => p.temperature!);
      
      const humidities = filePoints
        .filter(p => p.humidity !== undefined)
        .map(p => p.humidity!);

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
        serialNumber: file.parsedData?.deviceMetadata?.serialNumber || 'Unknown',
        minTemp: tempStats.min,
        maxTemp: tempStats.max,
        avgTemp: tempStats.avg,
        minHumidity: humidityStats.min,
        maxHumidity: humidityStats.max,
        avgHumidity: humidityStats.avg,
        meetsLimits,
        isExternal: file.zoneNumber === 0
      };
    }).sort((a, b) => {
      // Сортируем: сначала зоны от 1 и выше (по возрастанию), затем зона 0 (Внешний) в конце
      if (a.zoneNumberRaw === 0 && b.zoneNumberRaw === 0) return 0;
      if (a.zoneNumberRaw === 0) return 1; // Зона 0 всегда в конце
      if (b.zoneNumberRaw === 0) return -1; // Зона 0 всегда в конце
      return a.zoneNumberRaw - b.zoneNumberRaw; // Остальные зоны по возрастанию
    });
  }, [data, files, limits, zoomState, qualificationObjectId, projectId, qualificationObject, getLoggerNameForZoneAndLevel, contractFields.testType, markers]); // Добавляем contractFields.testType и markers для фильтрации по маркерам

  // Вычисляем глобальные минимальные и максимальные значения (исключая внешние датчики)
  const { globalMinTemp, globalMaxTemp } = useMemo(() => {
    const nonExternalResults = analysisResults.filter(result => !result.isExternal);
    const minTempValues = nonExternalResults
      .map(result => parseFloat(result.minTemp))
      .filter(val => !isNaN(val));
    const maxTempValues = nonExternalResults
      .map(result => parseFloat(result.maxTemp))
      .filter(val => !isNaN(val));
    
    // Используем итеративный подход для больших массивов
    let globalMinTemp: number | null = null;
    let globalMaxTemp: number | null = null;
    
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
    
    return {
      globalMinTemp,
      globalMaxTemp
    };
  }, [analysisResults]);

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
    
    // Находим последнюю точку, где температура еще в диапазоне
    let lastInRangeIndex = -1;
    for (let i = 0; i < pointsAfterMarker.length; i++) {
      const temp = pointsAfterMarker[i].temperature!;
      if (temp >= minLimit && temp <= maxLimit) {
        lastInRangeIndex = i;
      } else {
        break; // Прерываем, если температура вышла из диапазона
      }
    }
    
    if (lastInRangeIndex === -1) return '-';
    
    const timeInRange = pointsAfterMarker[lastInRangeIndex].timestamp - markerTimestamp;
    return formatTimeDuration(timeInRange);
  };

  // Функция для вычисления времени восстановления до диапазона после включения питания (power_on)
  const calculateRecoveryTimeAfterPowerOn = (
    points: TimeSeriesPoint[],
    markerTimestamp: number,
    minLimit: number | undefined,
    maxLimit: number | undefined
  ): string => {
    if (!minLimit || !maxLimit || !data) return '-';
    
    // Фильтруем точки после маркера включения
    const pointsAfterMarker = points
      .filter(p => p.timestamp >= markerTimestamp && p.temperature !== undefined)
      .sort((a, b) => a.timestamp - b.timestamp);
    
    if (pointsAfterMarker.length === 0) return '-';
    
    // Находим первую точку, где температура входит в диапазон
    for (let i = 0; i < pointsAfterMarker.length; i++) {
      const temp = pointsAfterMarker[i].temperature!;
      if (temp >= minLimit && temp <= maxLimit) {
        const recoveryTime = pointsAfterMarker[i].timestamp - markerTimestamp;
        return formatTimeDuration(recoveryTime);
      }
    }
    
    return '-'; // Температура не восстановилась
  };

  // Функция для вычисления времени восстановления после открытия двери (temperature_recovery)
  const calculateRecoveryTimeAfterDoorOpening = (
    points: TimeSeriesPoint[],
    markerTimestamp: number,
    minLimit: number | undefined,
    maxLimit: number | undefined
  ): { time: string; meetsCriterion: string } => {
    if (!minLimit || !maxLimit || !data) {
      return { time: '-', meetsCriterion: '-' };
    }
    
    // Фильтруем точки после маркера открытия двери
    const pointsAfterMarker = points
      .filter(p => p.timestamp >= markerTimestamp && p.temperature !== undefined)
      .sort((a, b) => a.timestamp - b.timestamp);
    
    if (pointsAfterMarker.length === 0) {
      return { time: '-', meetsCriterion: '-' };
    }
    
    // Находим первую точку, где температура входит в диапазон
    for (let i = 0; i < pointsAfterMarker.length; i++) {
      const temp = pointsAfterMarker[i].temperature!;
      if (temp >= minLimit && temp <= maxLimit) {
        const recoveryTime = pointsAfterMarker[i].timestamp - markerTimestamp;
        const timeInMinutes = Math.floor(recoveryTime / (1000 * 60));
        // Критерий: восстановление должно быть не более 30 минут (можно настроить)
        const meetsCriterion = timeInMinutes <= 30 ? 'Да' : 'Нет';
        return { time: formatTimeDuration(recoveryTime), meetsCriterion };
      }
    }
    
    return { time: '-', meetsCriterion: 'Нет' }; // Температура не восстановилась
  };

  // Получаем маркер для текущего типа испытания
  const getTestMarker = (): VerticalMarker | null => {
    if (!contractFields.testType || markers.length === 0) return null;
    
    // Для power_off и power_on ищем маркер типа 'test'
    // Для temperature_recovery ищем маркер типа 'door_opening'
    const markerType = contractFields.testType === 'temperature_recovery' ? 'door_opening' : 'test';
    const testMarkers = markers.filter(m => m.type === markerType);
    
    if (testMarkers.length === 0) return null;
    
    // Берем первый маркер (можно улучшить логику выбора)
    return testMarkers[0];
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
    // Определяем название маркера на основе количества существующих маркеров
    // Нечётные по порядку (1, 3, 5, ...): "Начало испытания"
    // Чётные по порядку (2, 4, 6, ...): "Завершение испытания"
    const markerNumber = markers.length + 1;
    const label = markerNumber % 2 === 1 
      ? 'Начало испытания' 
      : 'Завершение испытания';
    
    const newMarker: VerticalMarker = {
      id: Date.now().toString(),
      timestamp,
      label,
      color: '#000000', // Черный цвет для всех маркеров
      type: 'test'
    };
    setMarkers(prev => [...prev, newMarker]);
  }, [markers.length]);

  const handleUpdateMarker = (id: string, label: string) => {
    setMarkers(prev => prev.map(m => m.id === id ? { ...m, label } : m));
    setEditingMarker(null);
  };

  const handleUpdateMarkerType = (id: string, type: MarkerType) => {
    // Все маркеры должны быть черного цвета
    const color = '#000000';
    // Если тип изменен на "Открытие двери", автоматически устанавливаем название
    const label = type === 'door_opening' ? 'Открытие двери' : undefined;
    setMarkers(prev => prev.map(m => {
      if (m.id === id) {
        return { ...m, type, color, ...(label !== undefined ? { label } : {}) };
      }
      return m;
    }));
    setEditingMarkerType(null);
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
      case 'test':
        return 'Испытание';
      case 'door_opening':
        return 'Открытие двери';
      default:
        return 'Неизвестно';
    }
  };

  const handleDeleteMarker = (id: string) => {
    setMarkers(prev => prev.filter(m => m.id !== id));
  };

  const handleResetZoom = () => {
    setZoomState(undefined);
  };

  const handleContractFieldChange = (field: keyof typeof contractFields, value: string) => {
    setContractFields(prev => ({
      ...prev,
      [field]: value
    }));
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
      
      const templateData: TemplateReportData = {
        title: `Отчет по анализу временных рядов - ${dataTypeLabel}`,
        date: dateStr, // Только дата без времени
        dataType,
        analysisResults,
        conclusions,
        researchObject: qualificationObject?.name || 'Не указан',
        conditioningSystem: qualificationObject?.climateSystem || '',
       testType: convertedTestType || '',
        limits: limits,
        executor: user?.fullName || '',
        testDate: (() => {
          console.log('🔍 DEBUG testDate:');
          console.log('  - dateStr:', dateStr);
          console.log('  - dateStr type:', typeof dateStr);
          console.log('  - dateStr length:', dateStr.length);
          return dateStr;
        })(),
        reportNo: '',
        reportDate: ''
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
                analysisResults,
                contractFields,
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
                analysisResults,
                contractFields,
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
      
    } catch (error) {
      console.error('Ошибка генерации отчета по шаблону:', error);
      alert(`Ошибка при формировании отчета по шаблону: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      setReportStatus(prev => ({ ...prev, isGenerating: false }));
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
      
      // Проверяем, есть ли URL отчета
      if (!report.reportUrl) {
        alert('Ссылка на отчет недоступна');
        return;
      }

      // Создаем временную ссылку для скачивания
      const link = document.createElement('a');
      link.href = report.reportUrl;
      link.download = report.reportFilename || 'отчет.docx';
      link.target = '_blank';
      
      // Добавляем ссылку в DOM, кликаем и удаляем
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('Отчет скачан:', report.reportFilename);
    } catch (error) {
      console.error('Ошибка скачивания отчета:', error);
      alert('Ошибка при скачивании отчета');
    }
  };

  const handleAutoFillConclusions = () => {
    // Определяем временные рамки
    let startTime: Date;
    let endTime: Date;
    let duration: number;

    if (markers.length >= 2) {
      // Если есть маркеры, используем первый и последний
      const sortedMarkers = [...markers].sort((a, b) => a.timestamp - b.timestamp);
      startTime = new Date(sortedMarkers[0].timestamp);
      endTime = new Date(sortedMarkers[sortedMarkers.length - 1].timestamp);
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
    const validResults = nonExternalResults.filter(result => 
      result.minTemp !== '-' && result.maxTemp !== '-'
    );

    if (validResults.length === 0) {
      setConclusions('Недостаточно данных для формирования выводов.');
      return;
    }

    // Находим результат с минимальной температурой
    const minTempResult = validResults.reduce((min, current) => {
      const minTemp = parseFloat(min.minTemp);
      const currentMinTemp = parseFloat(current.minTemp);
      return currentMinTemp < minTemp ? current : min;
    });

    // Находим результат с максимальной температурой
    const maxTempResult = validResults.reduce((max, current) => {
      const maxTemp = parseFloat(max.maxTemp);
      const currentMaxTemp = parseFloat(current.maxTemp);
      return currentMaxTemp > maxTemp ? current : max;
    });

    // Проверяем соответствие лимитам
    let meetsLimits = true;
    if (limits.temperature) {
      const minTemp = parseFloat(minTempResult.minTemp);
      const maxTemp = parseFloat(maxTempResult.maxTemp);
      
      if (limits.temperature.min !== undefined && minTemp < limits.temperature.min) {
        meetsLimits = false;
      }
      if (limits.temperature.max !== undefined && maxTemp > limits.temperature.max) {
        meetsLimits = false;
      }
    }

    // Формируем текст выводов
    const conclusionText = `Начало испытания: ${startTime.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}
Завершение испытания: ${endTime.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}
Длительность испытания: ${durationText}
Зафиксированное минимальное значение: ${minTempResult.minTemp}°C в зоне измерения ${minTempResult.zoneNumber} на высоте ${minTempResult.measurementLevel} м.
Зафиксированное максимальное значение: ${maxTempResult.maxTemp}°C в зоне измерения ${maxTempResult.zoneNumber} на высоте ${maxTempResult.measurementLevel} м.
Результаты испытания ${meetsLimits ? 'соответствуют' : 'не соответствуют'} заданному критерию приемлемости.`;

    setConclusions(conclusionText);
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
                {data.hasHumidity && (
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Управление масштабом</label>
              <button
                onClick={handleResetZoom}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors w-full"
              >
                Сбросить масштаб
              </button>
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
                        {editingMarkerType === marker.id ? (
                          <select
                            value={marker.type}
                            onChange={(e) => handleUpdateMarkerType(marker.id, e.target.value as MarkerType)}
                            onBlur={() => setEditingMarkerType(null)}
                            className="text-xs px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            autoFocus
                            title="Тип маркера"
                            aria-label="Тип маркера"
                          >
                            <option value="test">Испытание</option>
                            <option value="door_opening">Открытие двери</option>
                          </select>
                        ) : (
                          <span 
                            className="text-xs px-2 py-1 bg-white border border-gray-200 rounded cursor-pointer hover:bg-gray-50"
                            onClick={() => setEditingMarkerType(marker.id)}
                          >
                            {getMarkerTypeLabel(marker.type)}
                          </span>
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
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Analysis Results Table - условный рендеринг в зависимости от типа испытания */}
      {(() => {
        const testType = contractFields.testType;
        
        // Стандартная таблица для empty_volume и loaded_volume
        if (testType === 'empty_volume' || testType === 'loaded_volume') {
          return (
            <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Результаты анализа</h3>
          
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Мин. t°C
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Макс. t°C
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Среднее t°C
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Соответствие критериям
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analysisResults.map((result, index) => (
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
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 ${
                      !result.isExternal && !isNaN(parseFloat(result.minTemp)) && 
                      globalMinTemp !== null && parseFloat(result.minTemp) === globalMinTemp
                        ? 'bg-blue-200' 
                        : ''
                    }`}>
                      {result.minTemp}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 ${
                      !result.isExternal && !isNaN(parseFloat(result.maxTemp)) && 
                      globalMaxTemp !== null && parseFloat(result.maxTemp) === globalMaxTemp
                        ? 'bg-red-200' 
                        : ''
                    }`}>
                      {result.maxTemp}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {result.avgTemp === '-' || !result.avgTemp ? '-' : parseFloat(result.avgTemp).toFixed(1).replace('.', ',')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-gray-200 px-2 py-1 rounded font-mono">DL-023</span>
              <span>Наименование логгера (первые 6 символов файла)</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-600">
            <strong>Примечание:</strong> При изменении масштаба графика статистика пересчитывается только для выбранного временного периода.
          </div>
            </div>
          );
        }
        
        // Таблица для power_off: Испытание на сбой электропитания (отключение)
        if (testType === 'power_off') {
          return (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Результаты анализа</h3>
              
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
                    Питание выключено. Время, в течение которого температура находится в требуемом диапазоне, (час: мин)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analysisResults.map((result, index) => {
                  const testMarker = getTestMarker();
                  const zoneNumber = result.zoneNumberRaw !== undefined ? result.zoneNumberRaw : (result.zoneNumber === 'Внешний' || result.zoneNumber === '0' ? 0 : parseInt(result.zoneNumber.toString()) || 0);
                  const filePoints = data?.points.filter(p => {
                    const pZone = p.zoneNumber !== null && p.zoneNumber !== undefined ? p.zoneNumber : 0;
                    const pLevel = p.measurementLevel?.toString() || 'unknown';
                    return `${pZone}_${pLevel}` === `${zoneNumber}_${result.measurementLevel.toString()}`;
                  }) || [];
                  
                  const timeInRange = testMarker && limits.temperature
                    ? calculateTimeInRangeAfterPowerOff(
                        filePoints,
                        testMarker.timestamp,
                        limits.temperature.min,
                        limits.temperature.max
                      )
                    : '-';
                  
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
            </div>
          );
        }
        
        // Таблица для power_on: Испытание на сбой электропитания (включение)
        if (testType === 'power_on') {
          return (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Результаты анализа</h3>
              
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
                {analysisResults.map((result, index) => {
                  const testMarker = getTestMarker();
                  const zoneNumber = result.zoneNumberRaw !== undefined ? result.zoneNumberRaw : (result.zoneNumber === 'Внешний' || result.zoneNumber === '0' ? 0 : parseInt(String(result.zoneNumber)) || 0);
                  const resultLevel = typeof result.measurementLevel === 'string' ? result.measurementLevel : String(result.measurementLevel || 'unknown');
                  const filePoints = data?.points.filter(p => {
                    const pZone = p.zoneNumber !== null && p.zoneNumber !== undefined ? p.zoneNumber : 0;
                    const pLevel = p.measurementLevel?.toString() || 'unknown';
                    return `${pZone}_${pLevel}` === `${zoneNumber}_${resultLevel}`;
                  }) || [];
                  
                  const recoveryTime = testMarker && limits.temperature
                    ? calculateRecoveryTimeAfterPowerOn(
                        filePoints,
                        testMarker.timestamp,
                        limits.temperature.min,
                        limits.temperature.max
                      )
                    : '-';
                  
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
            </div>
          );
        }
        
        // Таблица для temperature_recovery: Испытание по восстановлению температуры после открытия двери
        if (testType === 'temperature_recovery') {
          return (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Результаты анализа</h3>
              
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
                {analysisResults.map((result, index) => {
                  const testMarker = getTestMarker();
                  const zoneNumber = result.zoneNumberRaw !== undefined ? result.zoneNumberRaw : (result.zoneNumber === 'Внешний' || result.zoneNumber === '0' ? 0 : parseInt(String(result.zoneNumber)) || 0);
                  const resultLevel = typeof result.measurementLevel === 'string' ? result.measurementLevel : String(result.measurementLevel || 'unknown');
                  const filePoints = data?.points.filter(p => {
                    const pZone = p.zoneNumber !== null && p.zoneNumber !== undefined ? p.zoneNumber : 0;
                    const pLevel = p.measurementLevel?.toString() || 'unknown';
                    return `${pZone}_${pLevel}` === `${zoneNumber}_${resultLevel}`;
                  }) || [];
                  
                  const recoveryData = testMarker && limits.temperature
                    ? calculateRecoveryTimeAfterDoorOpening(
                        filePoints,
                        testMarker.timestamp,
                        limits.temperature.min,
                        limits.temperature.max
                      )
                    : { time: '-', meetsCriterion: '-' };
                  
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
          <button
            onClick={handleAutoFillConclusions}
            className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Заполнить
          </button>
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

          {/* Кнопка генерации отчета */}
          <div className="flex justify-center">
            <button
              onClick={handleGenerateTemplateReport}
              disabled={Boolean(
                reportStatus.isGenerating || 
                !reportStatus.templateFile || 
                (reportStatus.templateValidation && !reportStatus.templateValidation.isValid)
              )}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 text-lg font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              title="Сформировать отчет по загруженному шаблону"
            >
              {reportStatus.isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Формирование отчета...</span>
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  <span>Сформировать отчет</span>
                </>
              )}
            </button>
          </div>
          
          
          {/* Информация о плейсхолдерах для шаблона */}
          <div className="w-full max-w-2xl bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              Поддерживаемые плейсхолдеры в шаблоне:
            </h4>
            <div className="text-xs text-blue-800 space-y-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <p><strong>Основные:</strong></p>
                  <p>• <code>{'{chart}'}</code> - изображение графика (PNG)</p>
                  <p>• <code>{'{Table}'}</code> - таблица результатов анализа</p>
                  <p>• <code>{'{Result}'}</code> - текст выводов из поля "Выводы"</p>
                  <p>• <code>{'{Object}'}</code> - наименование объекта квалификации</p>
                  <p>• <code>{'{ConditioningSystem}'}</code> - климатическая установка</p>
                  <p>• <code>{'{System}'}</code> - климатическая установка (альтернативный)</p>
                  <p>• <code>{'{NameTest}'}</code> - тип испытания</p>
                </div>
                <div>
                  <p><strong>Дополнительные:</strong></p>
                  <p>• <code>{'{Limits}'}</code> - установленные лимиты с единицами измерения</p>
                  <p>• <code>{'{Executor}'}</code> - ФИО исполнителя (текущий пользователь)</p>
                  <p>• <code>{'{TestDate}'}</code> - дата испытания (текущая дата)</p>
                  <p>• <code>{'{ReportNo}'}</code> - номер договора из настроек анализа</p>
                  <p>• <code>{'{ReportDate}'}</code> - дата договора из настроек анализа</p>
                  <p>• <code>{'{title}'}</code> - заголовок отчета</p>
                  <p>• <code>{'{date}'}</code> - дата создания отчета</p>
                </div>
              </div>
            </div>
            <p className="text-xs mt-2"><strong>Важно:</strong> Плейсхолдер <code>{'{chart}'}</code> обязателен для корректной работы шаблона. Изображение будет вставлено с высоким разрешением и повернуто на 90° против часовой стрелки.</p>
            <p className="text-xs mt-1"><strong>Таблица результатов:</strong> Для вставки таблицы результатов анализа используйте плейсхолдер <code>{'{Table}'}</code>. Если плейсхолдер отсутствует в шаблоне, таблица не будет вставлена.</p>
            <p className="text-xs mt-1"><strong>Колонтитулы:</strong> Все плейсхолдеры также работают в верхних и нижних колонтитулах документа (header1.xml, header2.xml, header3.xml, footer1.xml, footer2.xml, footer3.xml).</p>
          </div>
        </div>

        {/* Секция сохраненных отчетов */}
        {projectId && qualificationObjectId && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-indigo-600" />
              Сохраненные отчеты
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
    </div>
  );
};