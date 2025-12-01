import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, CheckCircle, AlertTriangle, Save, CalendarDays, Upload, FileText, X, User, XCircle, BarChart3 } from 'lucide-react';
import { qualificationWorkScheduleService } from '../utils/qualificationWorkScheduleService';
import { qualificationObjectService } from '../utils/qualificationObjectService';
import { auditService } from '../utils/auditService';
import { EquipmentPlacement } from './EquipmentPlacement';
import { DocumentationCheckComponent } from './DocumentationCheck';
import { MeasurementZone } from '../types/QualificationObject';
import { VI2ParsingService } from '../utils/vi2Parser';
import { XLSParser } from '../utils/xlsParser';
import { loggerDataService } from '../utils/loggerDataService';
import { useAuth } from '../contexts/AuthContext';

interface QualificationWorkStage {
  id: string;
  name: string;
  description: string;
  startDate?: string;
  endDate?: string;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: string;
  cancelledAt?: string;
  cancelledBy?: string;
}

interface QualificationWorkScheduleProps {
  qualificationObjectId: string;
  qualificationObjectName: string;
  projectId?: string;
  project?: any; // Добавляем полный объект проекта
  onPageChange?: (page: string, data?: any) => void;
  mode?: 'view' | 'edit'; // Режим просмотра или редактирования
  hideTestDocuments?: boolean; // Скрыть блок "Документы по испытанию" и "Информация о расписании"
}

const QUALIFICATION_STAGES: Omit<QualificationWorkStage, 'id' | 'startDate' | 'endDate' | 'isCompleted'>[] = [
  {
    name: 'Расстановка логгеров',
    description: 'Установка и настройка логгеров для мониторинга температуры'
  },
  {
    name: 'Испытание на соответствие критериям в пустом объеме',
    description: 'Проверка соответствия температурных характеристик в пустом состоянии'
  },
  {
    name: 'Испытание на соответствие критериям в загруженном объеме',
    description: 'Проверка соответствия температурных характеристик при полной загрузке'
  },
  {
    name: 'Испытание на восстановление температуры после открытия двери',
    description: 'Проверка времени восстановления температурного режима после открытия'
  },
  {
    name: 'Испытание на сбой электропитания (отключение)',
    description: 'Проверка поведения системы при отключении электропитания'
  },
  {
    name: 'Испытание на сбой электропитания (включение)',
    description: 'Проверка запуска системы после включения электропитания'
  },
  {
    name: 'Снятие логгеров',
    description: 'Демонтаж и извлечение логгеров после завершения испытаний'
  }
];

export const QualificationWorkSchedule: React.FC<QualificationWorkScheduleProps> = ({
  qualificationObjectId,
  qualificationObjectName,
  projectId,
  project,
  onPageChange,
  mode = 'edit',
  hideTestDocuments = false
}) => {
  const { user } = useAuth();
  const [stages, setStages] = useState<QualificationWorkStage[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [measurementZones, setMeasurementZones] = useState<MeasurementZone[]>([]);
  const [testDocuments, setTestDocuments] = useState<File[]>([]);
  const [loggerRemovalFiles, setLoggerRemovalFiles] = useState<{ [key: string]: File | null }>({});
  const [storageFiles, setStorageFiles] = useState<{ [key: string]: { name: string; url: string; size: number; lastModified: string } }>({});
  const [parsingStatus, setParsingStatus] = useState<{ [key: string]: 'parsing' | 'completed' | 'error' | 'processing' | undefined }>({});
  const [parsingResults, setParsingResults] = useState<{ [key: string]: { recordCount: number; error?: string } }>({});
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [parsingProgress, setParsingProgress] = useState<{ [key: string]: number }>({});
  const [stageCompletionLoading, setStageCompletionLoading] = useState<{ [key: string]: boolean }>({});

  // Загрузка расписания из базы данных
  const loadSchedule = async () => {
    if (!qualificationWorkScheduleService.isAvailable()) {
      console.warn('Сервис расписания недоступен, используем локальные данные');
      initializeStages();
      return;
    }

    setLoading(true);
    try {
      console.log('Загрузка расписания для объекта:', qualificationObjectId, 'проекта:', projectId);
      const savedStages = await qualificationWorkScheduleService.getWorkSchedule(qualificationObjectId, projectId);
      
      if (savedStages.length > 0) {
        console.log('Найдены сохраненные этапы:', savedStages.length);
        // Используем этапы из БД без дополнительной фильтрации, так как сервис уже фильтрует по проекту
        const filteredStages = savedStages;
        
        console.log(`QualificationWorkSchedule: Фильтрация этапов: ${savedStages.length} -> ${filteredStages.length} (удалено дубликатов: ${savedStages.length - filteredStages.length})`);
        
        // Проверяем, есть ли все этапы (должно быть 7)
        if (filteredStages.length < QUALIFICATION_STAGES.length) {
          console.log(`QualificationWorkSchedule: Недостаточно этапов (${filteredStages.length} из ${QUALIFICATION_STAGES.length}), создаем недостающие для проекта:`, projectId);
          // Создаем недостающие этапы с привязкой к проекту
          const allStages = await qualificationWorkScheduleService.createAllStages(qualificationObjectId, projectId);
          // Используем все этапы (существующие + новые) из сервиса
          savedStages.splice(0, savedStages.length, ...allStages);
        } else {
          // Используем отфильтрованные этапы
          savedStages.splice(0, savedStages.length, ...filteredStages);
        }

        // Удаляем дубликаты по названию этапа
        const uniqueStages = savedStages.filter((stage, index, self) => 
          index === self.findIndex(s => s.stageName === stage.stageName)
        );
        
        console.log(`QualificationWorkSchedule: Удалено дубликатов: ${savedStages.length - uniqueStages.length}`);
        
        // Преобразуем данные из базы в формат компонента
        const convertedStages = uniqueStages.map(stage => {
          console.log('QualificationWorkSchedule: Преобразование этапа:', stage.stageName, {
            rawStartDate: stage.startDate,
            rawEndDate: stage.endDate,
            startDateType: typeof stage.startDate,
            endDateType: typeof stage.endDate
          });
          
          // Форматируем даты для input type="date" (YYYY-MM-DD)
          // Используем локальное время, чтобы избежать проблем с часовыми поясами
          const formatDateForInput = (date: string | Date | null | undefined): string => {
            if (!date) return '';
            if (typeof date === 'string') {
              // Если это ISO строка, извлекаем только дату (но нужно учесть часовой пояс)
              if (date.includes('T')) {
                // Парсим ISO строку и используем локальное время
                const d = new Date(date);
                if (!isNaN(d.getTime())) {
                  const year = d.getFullYear();
                  const month = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  return `${year}-${month}-${day}`;
                }
                // Если парсинг не удался, просто извлекаем дату из строки
                return date.split('T')[0];
              }
              // Если это уже в формате YYYY-MM-DD, возвращаем как есть
              if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return date;
              }
              // Пытаемся распарсить и отформатировать
              try {
                const d = new Date(date);
                if (!isNaN(d.getTime())) {
                  // Используем локальное время вместо UTC
                  const year = d.getFullYear();
                  const month = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  return `${year}-${month}-${day}`;
                }
              } catch (e) {
                console.warn('Ошибка форматирования даты:', date, e);
              }
              return '';
            }
            if (date instanceof Date) {
              // Используем локальное время вместо UTC
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              return `${year}-${month}-${day}`;
            }
            return '';
          };
          
          return {
            id: stage.id,
            name: stage.stageName,
            description: stage.stageDescription,
            startDate: formatDateForInput(stage.startDate),
            endDate: formatDateForInput(stage.endDate),
            isCompleted: stage.isCompleted,
            completedAt: stage.completedAt || undefined,
            completedBy: stage.completedBy || undefined,
            cancelledAt: stage.cancelledAt || undefined,
            cancelledBy: stage.cancelledBy || undefined
          };
        });
        
        console.log('QualificationWorkSchedule: Загруженные этапы из БД:', {
          count: savedStages.length,
          stages: savedStages.map(s => ({ id: s.id, name: s.stageName }))
        });
        console.log('QualificationWorkSchedule: Преобразованные этапы:', {
          count: convertedStages.length,
          stages: convertedStages.map(s => ({ id: s.id, name: s.name }))
        });
        console.log('QualificationWorkSchedule: Этапы с завершением:', convertedStages.filter(s => s.isCompleted || s.cancelledAt));
        
        setStages(convertedStages);
      } else {
        // Если данных нет, создаем все этапы в базе данных с привязкой к проекту
        console.log('QualificationWorkSchedule: Этапы не найдены, создаем все этапы в БД для проекта:', projectId);
        const allStages = await qualificationWorkScheduleService.createAllStages(qualificationObjectId, projectId);
        
        // Преобразуем данные из базы в формат компонента
        // Форматируем даты для input type="date" (YYYY-MM-DD)
        // Используем локальное время, чтобы избежать проблем с часовыми поясами
        const formatDateForInput = (date: string | Date | null | undefined): string => {
          if (!date) return '';
          if (typeof date === 'string') {
            // Если это ISO строка, извлекаем только дату (но нужно учесть часовой пояс)
            if (date.includes('T')) {
              // Парсим ISO строку и используем локальное время
              const d = new Date(date);
              if (!isNaN(d.getTime())) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
              }
              // Если парсинг не удался, просто извлекаем дату из строки
              return date.split('T')[0];
            }
            // Если это уже в формате YYYY-MM-DD, возвращаем как есть
            if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
              return date;
            }
            // Пытаемся распарсить и отформатировать
            try {
              const d = new Date(date);
              if (!isNaN(d.getTime())) {
                // Используем локальное время вместо UTC
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
              }
            } catch (e) {
              console.warn('Ошибка форматирования даты:', date, e);
            }
            return '';
          }
          if (date instanceof Date) {
            // Используем локальное время вместо UTC
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
          return '';
        };
        
        const convertedStages = allStages.map(stage => ({
          id: stage.id,
          name: stage.stageName,
          description: stage.stageDescription,
          startDate: formatDateForInput(stage.startDate),
          endDate: formatDateForInput(stage.endDate),
          isCompleted: stage.isCompleted,
          completedAt: stage.completedAt || undefined,
          completedBy: stage.completedBy || undefined,
          cancelledAt: stage.cancelledAt || undefined,
          cancelledBy: stage.cancelledBy || undefined
        }));
        
        setStages(convertedStages);
      }
    } catch (error) {
      console.error('Ошибка загрузки расписания:', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setError(`Ошибка загрузки расписания из базы данных: ${errorMessage}`);
      // В случае ошибки инициализируем этапы локально
      initializeStages();
    } finally {
      setLoading(false);
    }
  };


  // Инициализация этапов
  const initializeStages = () => {
    const initializedStages = QUALIFICATION_STAGES.map((stage, index) => ({
      id: `temp-stage-${index + 1}`, // Временный ID для локальной инициализации
      ...stage,
      startDate: '',
      endDate: '',
      isCompleted: false
    }));
    console.log('QualificationWorkSchedule: Инициализация этапов:', {
      totalStages: QUALIFICATION_STAGES.length,
      initializedStages: initializedStages.length,
      stageNames: initializedStages.map(s => s.name)
    });
    setStages(initializedStages);
  };

  // Загрузка уже сохраненных файлов снятия логгеров
  const loadLoggerRemovalFiles = async () => {
    // Убрана проверка isAvailable - API клиент всегда доступен

    try {
      console.log('Загрузка файлов снятия логгеров для объекта:', qualificationObjectId);
      
      // Получаем файлы из Supabase Storage
      const storageFilesData = await qualificationObjectService.getLoggerRemovalFiles(qualificationObjectId);
      console.log('Загруженные файлы из Storage:', storageFilesData);
      console.log('Количество файлов из Storage:', Object.keys(storageFilesData).length);
      console.log('Ключи файлов из Storage:', Object.keys(storageFilesData));
      
      setStorageFiles(storageFilesData);
      
      // Также получаем данные из БД для отображения статуса парсинга
      let currentProjectId = projectId;
      if (!currentProjectId) {
        const urlParams = new URLSearchParams(window.location.search);
        currentProjectId = urlParams.get('projectId') || undefined;
      }
      
      if (currentProjectId && loggerDataService.isAvailable()) {
        console.log('Загружаем сводки данных логгеров из БД');
        const summaries = await loggerDataService.getLoggerDataSummary(currentProjectId, qualificationObjectId);
        console.log('Загруженные сводки данных логгеров:', summaries);
        
        // Обновляем статусы парсинга
        const statusMap: { [key: string]: 'parsing' | 'completed' | 'error' | 'processing' | undefined } = {};
        const resultsMap: { [key: string]: { recordCount: number; error?: string } } = {};
        
        // Группируем записи по fileKey и берем последнюю (самую свежую) запись
        const groupedSummaries = new Map<string, any>();
        summaries.forEach(summary => {
          // Нормализуем measurement_level перед созданием ключа
          const normalizedLevel = summary.measurement_level !== null && summary.measurement_level !== undefined
            ? (typeof summary.measurement_level === 'string' ? parseFloat(summary.measurement_level) : Number(summary.measurement_level))
            : null;
          
          // Нормализуем zone_number
          const normalizedZone = summary.zone_number !== null && summary.zone_number !== undefined
            ? (typeof summary.zone_number === 'string' ? parseInt(summary.zone_number, 10) : Number(summary.zone_number))
            : null;
          
          const fileKey = getLoggerRemovalFileKey(normalizedZone, normalizedLevel);
          
          console.log('QualificationWorkSchedule: Создание ключа для сводки:', {
            zone_number: summary.zone_number,
            zone_number_type: typeof summary.zone_number,
            normalizedZone,
            measurement_level: summary.measurement_level,
            measurement_level_type: typeof summary.measurement_level,
            normalizedLevel,
            fileKey,
            fileName: summary.file_name,
            parsing_status: summary.parsing_status
          });
          
          // Если запись уже есть, берем ту, у которой больше record_count (более свежая)
          if (!groupedSummaries.has(fileKey) || summary.record_count > groupedSummaries.get(fileKey).record_count) {
            groupedSummaries.set(fileKey, summary);
          }
        });
        
        // Собираем прогресс для всех файлов
        const progressMap: { [key: string]: number } = {};
        
        groupedSummaries.forEach((summary, fileKey) => {
          // Пересчитываем ключ для проверки с правильной нормализацией
          const normalizedLevel = summary.measurement_level !== null && summary.measurement_level !== undefined
            ? (typeof summary.measurement_level === 'string' ? parseFloat(summary.measurement_level) : Number(summary.measurement_level))
            : null;
          const normalizedZone = summary.zone_number !== null && summary.zone_number !== undefined
            ? (typeof summary.zone_number === 'string' ? parseInt(summary.zone_number, 10) : Number(summary.zone_number))
            : null;
          const recalculatedKey = getLoggerRemovalFileKey(normalizedZone, normalizedLevel);
          
          console.log(`QualificationWorkSchedule: Загружен статус для ${fileKey}:`, {
            fileKey,
            zone_number: summary.zone_number,
            zone_number_type: typeof summary.zone_number,
            normalizedZone,
            measurement_level: summary.measurement_level,
            measurement_level_type: typeof summary.measurement_level,
            normalizedLevel,
            parsing_status: summary.parsing_status,
            record_count: summary.record_count,
            file_name: summary.file_name,
            // Проверяем формирование ключа
            recalculatedKey,
            keysMatch: fileKey === recalculatedKey
          });
          
          // Используем пересчитанный ключ, если он отличается от исходного
          const finalKey = fileKey !== recalculatedKey ? recalculatedKey : fileKey;
          
          if (fileKey !== recalculatedKey) {
            console.warn(`QualificationWorkSchedule: Ключи не совпадают! Используем пересчитанный ключ. fileKey: ${fileKey}, recalculatedKey: ${recalculatedKey}`);
          }
          
          statusMap[finalKey] = summary.parsing_status as 'parsing' | 'completed' | 'error' | 'processing' | undefined;
          resultsMap[finalKey] = {
            recordCount: summary.record_count,
            error: summary.error_message || undefined
          };
          
          // Если статус completed, устанавливаем прогресс на 100%
          if (summary.parsing_status === 'completed') {
            progressMap[finalKey] = 100;
          }
        });
        
        console.log('QualificationWorkSchedule: Итоговые ключи статусов из БД:', Object.keys(statusMap));
        console.log('QualificationWorkSchedule: Все сводки из БД:', summaries.map(s => ({
          zone: s.zone_number,
          level: s.measurement_level,
          fileKey: getLoggerRemovalFileKey(s.zone_number, s.measurement_level),
          status: s.parsing_status,
          fileName: s.file_name
        })));
        
        // Обновляем прогресс одним вызовом
        if (Object.keys(progressMap).length > 0) {
          setParsingProgress(prev => ({
            ...prev,
            ...progressMap
          }));
        }
        
        console.log('QualificationWorkSchedule: Обновляем статусы парсинга:', statusMap);
        console.log('QualificationWorkSchedule: Доступные ключи статусов из БД:', Object.keys(statusMap));
        console.log('QualificationWorkSchedule: Текущие локальные статусы парсинга:', parsingStatus);
        console.log('QualificationWorkSchedule: Доступные ключи локальных статусов:', Object.keys(parsingStatus));
        
        // Объединяем статусы из БД с локальными статусами
        // Приоритет у статусов из БД, но если локальный статус 'completed', сохраняем его
        const mergedStatusMap = { ...parsingStatus };
        Object.keys(statusMap).forEach(key => {
          // Если в БД статус 'completed' или локальный статус 'completed', используем 'completed'
          if (statusMap[key] === 'completed' || mergedStatusMap[key] === 'completed') {
            mergedStatusMap[key] = 'completed';
          } else {
            mergedStatusMap[key] = statusMap[key];
          }
        });
        
        console.log('QualificationWorkSchedule: Объединенные статусы:', mergedStatusMap);
        console.log('QualificationWorkSchedule: Ключи объединенных статусов:', Object.keys(mergedStatusMap));
        
        setParsingStatus(mergedStatusMap);
        setParsingResults(resultsMap);
      }
      
      console.log('Файлы снятия логгеров загружены успешно');
      console.log('Итоговые файлы из Storage:', Object.keys(storageFilesData).map(key => `${key}: ${storageFilesData[key].name}`));
    } catch (error) {
      console.error('Ошибка загрузки файлов снятия логгеров:', error);
    }
  };

  // Загрузка зон измерения из объекта квалификации
  const loadMeasurementZones = async () => {
    // Убрана проверка isAvailable - API клиент всегда доступен

    try {
      console.log('Загрузка зон измерения для объекта:', qualificationObjectId);
      const qualificationObject = await qualificationObjectService.getQualificationObjectById(qualificationObjectId);
      console.log('Загруженный объект квалификации:', qualificationObject);
      
      if (qualificationObject && qualificationObject.measurementZones) {
        console.log('Найдены зоны измерения:', qualificationObject.measurementZones);
        
        // Проверяем, есть ли зона "Внешний датчик" (зона с номером 0)
        const hasExternalZone = qualificationObject.measurementZones.some(zone => zone.zoneNumber === 0);
        
        if (!hasExternalZone) {
          console.log('QualificationWorkSchedule: Зона "Внешний датчик" не найдена, создаем её');
          try {
            // Создаем зону "Внешний датчик" с номером 0
            const externalZone: MeasurementZone = {
              id: `zone-external-${Date.now()}`,
              zoneNumber: 0,
              measurementLevels: [
                {
                  id: `level-external-${Date.now()}`,
                  level: 1.0,
                  equipmentId: '',
                  equipmentName: ''
                }
              ]
            };
            
            // Добавляем зону "Внешний датчик" в начало списка
            // Перенумеровываем остальные зоны, начиная с 0
            const renumberedZones = qualificationObject.measurementZones.map((zone, index) => ({
              ...zone,
              zoneNumber: index + 1 // Старые зоны начинаются с 1, но теперь должны начинаться с 0
            }));
            const updatedZones = [externalZone, ...renumberedZones];
            
            // Сохраняем обновленные зоны
            await qualificationObjectService.updateMeasurementZones(qualificationObjectId, updatedZones);
            
            console.log('QualificationWorkSchedule: Зона "Внешний датчик" успешно создана');
            setMeasurementZones(updatedZones);
          } catch (error) {
            console.error('QualificationWorkSchedule: Ошибка создания зоны "Внешний датчик":', error);
            setMeasurementZones(qualificationObject.measurementZones);
          }
        } else {
          setMeasurementZones(qualificationObject.measurementZones);
        }
        
        // Загружаем уже сохраненные данные логгеров
        await loadLoggerRemovalFiles();
      } else {
        console.log('Зоны измерения не найдены или пусты');
        setMeasurementZones([]);
        // НЕ очищаем loggerRemovalFiles, чтобы сохранить уже загруженные файлы
        // setLoggerRemovalFiles({});
      }
    } catch (error) {
      console.error('Ошибка загрузки зон измерения:', error);
    }
  };

  // Инициализация при загрузке компонента
  useEffect(() => {
    loadSchedule();
    loadMeasurementZones();
  }, [qualificationObjectId]);

  // Обработка изменения дат
  const handleDateChange = (stageId: string, field: 'startDate' | 'endDate', value: string) => {
    if (mode === 'view') return; // Не изменяем даты в режиме просмотра
    
    console.log('QualificationWorkSchedule: handleDateChange:', { stageId, field, value });
    setStages(prevStages => 
      prevStages.map(stage => 
        stage.id === stageId 
          ? { ...stage, [field]: value || '' }
          : stage
      )
    );
  };

  // Обработка изменения единой даты (для этапов с одной датой)
  const handleSingleDateChange = (stageId: string, value: string) => {
    if (mode === 'view') return; // Не изменяем даты в режиме просмотра
    
    console.log('QualificationWorkSchedule: handleSingleDateChange:', { stageId, value });
    setStages(prevStages => 
      prevStages.map(stage => 
        stage.id === stageId 
          ? { ...stage, startDate: value || '', endDate: value || '' }
          : stage
      )
    );
  };

  // Проверка, нужно ли показывать только одно поле даты
  const isSingleDateStage = (stageName: string) => {
    const singleDateStages = [
      'Расстановка логгеров',
      'Испытание на восстановление температуры после открытия двери',
      'Снятие логгеров'
    ];
    return singleDateStages.includes(stageName);
  };

  // Валидация дат для этапа
  const validateStageDates = (stage: QualificationWorkStage): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (isSingleDateStage(stage.name)) {
      // Для этапов с одной датой проверяем только startDate
      if (!stage.startDate) {
        errors.push(`Необходимо указать дату для этапа "${stage.name}"`);
      }
    } else {
      // Для этапов с двумя датами проверяем обе даты
      if (!stage.startDate) {
        errors.push(`Необходимо указать дату начала для этапа "${stage.name}"`);
      }
      if (!stage.endDate) {
        errors.push(`Необходимо указать дату окончания для этапа "${stage.name}"`);
      }
      
      // Проверяем, что дата начала не позже даты окончания
      if (stage.startDate && stage.endDate) {
        const startDate = new Date(stage.startDate);
        const endDate = new Date(stage.endDate);
        
        if (startDate > endDate) {
          errors.push(`Дата начала не может быть позже даты окончания для этапа "${stage.name}"`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // Проверка, можно ли завершить этап
  const canCompleteStage = (stage: QualificationWorkStage): boolean => {
    if (stage.isCompleted) {
      return true; // Можно отменить завершение
    }
    
    // Проверяем, что даты заполнены (для этапов с одной датой - startDate, для остальных - startDate и endDate)
    if (isSingleDateStage(stage.name)) {
      // Для этапов с одной датой проверяем только startDate
      return !!(stage.startDate && stage.startDate.trim() !== '');
    } else {
      // Для этапов с двумя датами проверяем обе
      return !!(stage.startDate && stage.startDate.trim() !== '' && stage.endDate && stage.endDate.trim() !== '');
    }
  };

  // Обработка завершения/отмены этапа
  const handleStageCompletion = async (stageId: string) => {
    console.log('handleStageCompletion вызвана для stageId:', stageId);
    
    // Проверяем, не выполняется ли уже операция для этого этапа
    if (stageCompletionLoading[stageId]) {
      console.log('Операция уже выполняется для этапа:', stageId);
      return;
    }
    
    if (!user) {
      console.log('Пользователь не авторизован');
      setError('Необходимо войти в систему для завершения этапа');
      return;
    }

    const currentStage = stages.find(s => s.id === stageId);
    if (!currentStage) {
      console.log('Этап не найден');
      setError('Этап не найден');
      return;
    }

    // Если этап не завершен, проверяем, что даты заполнены
    if (!currentStage.isCompleted) {
      const canComplete = canCompleteStage(currentStage);
      if (!canComplete) {
        console.log('Даты не заполнены, завершение этапа невозможно');
        setError('Для завершения этапа необходимо заполнить даты');
        return;
      }
    }

    // Устанавливаем состояние загрузки
    setStageCompletionLoading(prev => ({ ...prev, [stageId]: true }));

    const now = new Date().toISOString();
    const userName = user.fullName || user.email || 'Неизвестный пользователь';

    console.log('Текущий этап:', currentStage);

    if (!currentStage) {
      console.log('Этап не найден');
      setError('Этап не найден');
      return;
    }

    const newCompletedStatus = !currentStage.isCompleted;
    console.log('Изменяем статус этапа с', currentStage.isCompleted, 'на', newCompletedStatus);

    // Обновляем локальное состояние
    const updatedStages = stages.map(stage => 
      stage.id === stageId 
        ? { 
            ...stage, 
            isCompleted: newCompletedStatus,
            completedAt: newCompletedStatus ? now : undefined,
            completedBy: newCompletedStatus ? userName : undefined,
            cancelledAt: !newCompletedStatus ? now : undefined,
            cancelledBy: !newCompletedStatus ? userName : undefined
          }
        : stage
    );

    setStages(updatedStages);

    const action = newCompletedStatus ? 'отмечен как завершенный' : 'отменен';
    console.log('Действие:', action);
    setSuccess(`Этап "${currentStage.name}" ${action}`);
    setTimeout(() => setSuccess(null), 3000);

    // Записываем событие в аудит
    try {
      const auditAction = newCompletedStatus ? 'qualification_stage_completed' : 'qualification_stage_cancelled';
      const clientInfo = auditService.getClientInfo();
      
      await auditService.createAuditLog({
        userId: user.id,
        userName: userName,
        userRole: user.role || 'user',
        action: auditAction,
        entityType: 'qualification_object',
        entityId: qualificationObjectId,
        entityName: qualificationObjectName,
        details: {
          stageId: stageId,
          stageName: currentStage.name,
          previousStatus: currentStage.isCompleted ? 'completed' : 'pending',
          newStatus: newCompletedStatus ? 'completed' : 'pending',
          projectId: projectId,
          completedAt: newCompletedStatus ? now : undefined,
          cancelledAt: !newCompletedStatus ? now : undefined
        },
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });
      
      console.log('Событие аудита записано:', auditAction);
    } catch (auditError) {
      console.error('Ошибка записи в аудит:', auditError);
      // Не прерываем выполнение основного действия из-за ошибки аудита
    }

    // Автоматически сохраняем изменения в базу данных
    try {
      console.log('Начинаем сохранение...');
      
      const updatedStage = updatedStages.find(s => s.id === stageId);
      if (updatedStage) {
        const stageToSave = {
          stageName: updatedStage.name,
          stageDescription: updatedStage.description,
          startDate: updatedStage.startDate || undefined,
          endDate: updatedStage.endDate || undefined,
          isCompleted: updatedStage.isCompleted,
          completedAt: updatedStage.completedAt || undefined,
          completedBy: updatedStage.completedBy || undefined,
          cancelledAt: updatedStage.cancelledAt || undefined,
          cancelledBy: updatedStage.cancelledBy || undefined
        };

        // Проверяем, является ли ID временным (начинается с temp-stage-)
        if (stageId.startsWith('temp-stage-')) {
          console.log('Создаем новый этап в БД с временным ID:', stageId);
          // Создаем новый этап в БД
          const createdStage = await qualificationWorkScheduleService.createWorkStage(
            qualificationObjectId,
            stageToSave
          );
          
          // Обновляем локальное состояние с реальным ID из БД
          setStages(prevStages => 
            prevStages.map(stage => 
              stage.id === stageId 
                ? { ...stage, id: createdStage.id }
                : stage
            )
          );
        } else {
          console.log('Обновляем существующий этап в БД с ID:', stageId);
          // Обновляем существующий этап с передачей projectId
          await qualificationWorkScheduleService.updateWorkStage(
            qualificationObjectId,
            stageId,
            stageToSave,
            projectId
          );
        }
      }
      
      console.log('Сохранение завершено успешно');
    } catch (error) {
      console.error('Ошибка автоматического сохранения:', error);
      setError('Ошибка сохранения изменений в базу данных');
      // Откатываем изменения в локальном состоянии
      setStages(stages);
    } finally {
      // Сбрасываем состояние загрузки
      setStageCompletionLoading(prev => ({ ...prev, [stageId]: false }));
    }
  };

  // Обработка изменения зон измерения
  const handleZonesChange = useCallback((zones: MeasurementZone[]) => {
    setMeasurementZones(zones);
  }, []);

  // Обработка загрузки документов
  const handleDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const isPdf = file.type === 'application/pdf';
      const isImage = file.type.startsWith('image/');
      return isPdf || isImage;
    });
    
    if (validFiles.length !== files.length) {
      setError('Поддерживаются только PDF документы и изображения');
      return;
    }
    
    setTestDocuments(prev => [...prev, ...validFiles]);
  };

  // Удаление документа
  const removeDocument = (index: number) => {
    setTestDocuments(prev => prev.filter((_, i) => i !== index));
  };

  // Получение иконки для типа файла
  const getFileIcon = (file: File) => {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (file.type === 'application/pdf' || fileExtension === '.pdf') {
      return <FileText className="w-4 h-4 text-red-600" />;
    } else if (file.type === 'text/csv' || fileExtension === '.csv') {
      return <FileText className="w-4 h-4 text-green-600" />;
    } else if (file.type === 'application/vnd.ms-excel' || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || fileExtension === '.xls' || fileExtension === '.xlsx') {
      return <FileText className="w-4 h-4 text-green-700" />;
    } else if (fileExtension === '.vi2') {
      return <FileText className="w-4 h-4 text-purple-600" />;
    }
    return <FileText className="w-4 h-4 text-gray-600" />;
  };

  // Обработка загрузки файла для снятия логгеров
  const handleLoggerRemovalFileUpload = async (levelId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file) {
      console.log('QualificationWorkSchedule: handleLoggerRemovalFileUpload вызвана', {
        levelId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });

      // Проверяем тип файла и расширение
      const allowedTypes = ['application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      const allowedExtensions = ['.vi2', '.csv', '.xls', '.xlsx', '.pdf'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      console.log('QualificationWorkSchedule: Проверка файла', {
        fileName: file.name,
        fileExtension,
        fileType: file.type,
        allowedTypes,
        allowedExtensions,
        isTypeAllowed: allowedTypes.includes(file.type),
        isExtensionAllowed: allowedExtensions.includes(fileExtension)
      });
      
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
        console.error('QualificationWorkSchedule: Неподдерживаемый тип файла', {
          fileName: file.name,
          fileType: file.type,
          fileExtension
        });
        setError('Поддерживаются только файлы: .vi2, .csv, .xls, .xlsx, .pdf');
        return;
      }
      
      // Проверяем размер файла (10MB)
      if (file.size > 10 * 1024 * 1024) {
        console.error('QualificationWorkSchedule: Файл слишком большой', {
          fileName: file.name,
          fileSize: file.size,
          maxSize: 10 * 1024 * 1024
        });
        setError('Размер файла не должен превышать 10MB');
        return;
      }

      // Устанавливаем прогресс загрузки
      setUploadProgress(prev => ({
        ...prev,
        [levelId]: 0
      }));

      // Если это файл .vi2 или .xls/.xlsx, запускаем парсинг
      if (['.vi2', '.xls', '.xlsx'].includes(fileExtension)) {
        console.log('QualificationWorkSchedule: Запускаем парсинг файла', {
          fileName: file.name,
          fileExtension
        });
        
        setUploadProgress(prev => ({
          ...prev,
          [levelId]: 100
        }));
        
        try {
          await handleFileParsing(levelId, file, fileExtension);
          console.log('QualificationWorkSchedule: Парсинг файла завершен успешно', {
            fileName: file.name
          });
        } catch (error) {
          console.error('QualificationWorkSchedule: Ошибка при вызове handleFileParsing', {
            fileName: file.name,
            error: error instanceof Error ? error.message : 'Неизвестная ошибка',
            stack: error instanceof Error ? error.stack : undefined
          });
          // Показываем ошибку пользователю
          setError(`Ошибка обработки файла ${file.name}: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
          // Устанавливаем статус ошибки
          setParsingStatus(prev => ({
            ...prev,
            [levelId]: 'error'
          }));
          // Перезагружаем файлы для обновления статусов
          setTimeout(async () => {
            await loadLoggerRemovalFiles();
          }, 1000);
        }
      } else {
        console.log('QualificationWorkSchedule: Файл не требует парсинга', {
          fileName: file.name,
          fileExtension
        });
        
        // Для других файлов просто устанавливаем прогресс загрузки
        setUploadProgress(prev => ({
          ...prev,
          [levelId]: 100
        }));
      }
    }
    
    setLoggerRemovalFiles(prev => ({
      ...prev,
      [levelId]: file
    }));
  };

  // Удаление файла снятия логгеров
  const removeLoggerRemovalFile = async (levelId: string) => {
    try {
      // Парсим ключ для получения номера зоны и уровня (поддерживает дробные значения)
      const parsed = parseLevelId(levelId);
      if (!parsed) {
        setError('Не удалось определить зону и уровень для удаления файла');
        return;
      }

      const { zoneNumber, level: measurementLevel } = parsed;

      console.log('Удаляем файл логгера:', { levelId, zoneNumber, measurementLevel });

      // Получаем projectId для удаления данных из БД
      let currentProjectId = projectId;
      if (!currentProjectId) {
        const urlParams = new URLSearchParams(window.location.search);
        currentProjectId = urlParams.get('projectId') || undefined;
      }

      if (!currentProjectId) {
        setError('ProjectId не найден для удаления данных логгера');
        return;
      }

      // Находим название файла для удаления из БД
      const storageFile = storageFiles[levelId];
      const fileName = storageFile?.name || null;

      // Удаляем файл из Storage
      try {
        await qualificationObjectService.deleteLoggerRemovalFile(qualificationObjectId, zoneNumber, measurementLevel);
        console.log('Файл удален из Storage');
      } catch (storageError) {
        console.warn('Ошибка удаления файла из Storage (может быть уже удален):', storageError);
        // Продолжаем удаление данных из БД даже если файл не найден в Storage
      }

      // Удаляем данные из базы данных
      if (fileName && loggerDataService.isAvailable()) {
        try {
          const deleteResult = await loggerDataService.deleteLoggerData(
            currentProjectId,
            qualificationObjectId,
            fileName
          );
          
          if (!deleteResult.success) {
            console.error('Ошибка удаления данных из БД:', deleteResult.error);
            setError(`Ошибка удаления данных из БД: ${deleteResult.error}`);
            return;
          }
          console.log('Данные удалены из БД');
        } catch (dbError) {
          console.error('Ошибка при удалении данных из БД:', dbError);
          // Продолжаем удаление локального состояния даже если БД ошибка
        }
      } else if (!fileName) {
        console.warn('Имя файла не найдено для удаления из БД');
      }

      // Обновляем локальное состояние
      setLoggerRemovalFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[levelId];
        return newFiles;
      });
      
      setStorageFiles(prev => {
        const newStorageFiles = { ...prev };
        delete newStorageFiles[levelId];
        return newStorageFiles;
      });

      // Очищаем статусы парсинга
      setParsingStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus[levelId];
        return newStatus;
      });

      setParsingResults(prev => {
        const newResults = { ...prev };
        delete newResults[levelId];
        return newResults;
      });

      setParsingProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[levelId];
        return newProgress;
      });

      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[levelId];
        return newProgress;
      });

      setSuccess('Файл логгера успешно удален');
      setTimeout(() => setSuccess(null), 3000);

    } catch (error) {
      console.error('Ошибка удаления файла логгера:', error);
      setError(`Ошибка удаления файла: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  // Получение ключа для файла снятия логгеров
  const getLoggerRemovalFileKey = (zoneNumber: number | string | null | undefined, level: number | string | null | undefined) => {
    // Нормализуем значения: приводим к числам и форматируем одинаково
    const normalizedZone = zoneNumber === null || zoneNumber === undefined 
      ? 0 
      : (typeof zoneNumber === 'string' ? parseInt(zoneNumber, 10) : Number(zoneNumber));
    
    const normalizedLevel = level === null || level === undefined 
      ? 0 
      : (typeof level === 'string' ? parseFloat(level) : Number(level));
    
    // Форматируем уровень измерения: убираем лишние нули в конце, но сохраняем дробную часть
    // Например: 0.30 -> 0.3, 2.10 -> 2.1, но 0.33 остается 0.33
    // Для целых чисел (1, 2, 3) оставляем без точки: 1, 2, 3
    // Используем parseFloat и toString для нормализации
    let levelStr: string;
    if (isNaN(normalizedLevel)) {
      levelStr = '0';
    } else {
      const num = parseFloat(normalizedLevel.toString());
      // Если число целое, выводим без точки, иначе с точкой
      if (num % 1 === 0) {
        levelStr = num.toString();
      } else {
        levelStr = num.toString();
      }
    }
    
    const fileKey = `zone-${normalizedZone}-level-${levelStr}`;
    
    // Отладочное логирование для диагностики
    if (normalizedZone === 0 && normalizedLevel === 1) {
      console.log('QualificationWorkSchedule: Формирование ключа для zone-0-level-1:', {
        zoneNumber,
        level,
        normalizedZone,
        normalizedLevel,
        levelStr,
        fileKey
      });
    }
    
    return fileKey;
  };

  // Извлечение zoneNumber и level из levelId
  const parseLevelId = (levelId: string) => {
    const match = levelId.match(/zone-(\d+)-level-(.+)/);
    if (match) {
      const result = {
        zoneNumber: parseInt(match[1]),
        level: parseFloat(match[2])
      };
      console.log(`parseLevelId: ${levelId} ->`, result);
      return result;
    }
    console.log(`parseLevelId: не удалось распарсить ${levelId}`);
    return null;
  };

  // Обработка парсинга файлов (VI2 и XLS)
  const handleFileParsing = async (levelId: string, file: File, fileExtension: string) => {
    try {
      console.log('QualificationWorkSchedule: handleFileParsing вызвана', {
        levelId,
        fileName: file.name,
        fileSize: file.size,
        fileExtension,
        fileType: file.type
      });

      // Парсим ключ для получения номера зоны и уровня
      const parsed = parseLevelId(levelId);
      if (!parsed) {
        console.error('QualificationWorkSchedule: Не удалось распарсить levelId:', levelId);
        setError('Не удалось определить зону и уровень измерения');
        return;
      }

      const { zoneNumber, level: measurementLevel } = parsed;

      // Проверяем формирование ключа файла
      const expectedFileKeyForParsing = getLoggerRemovalFileKey(zoneNumber, measurementLevel);
      console.log('QualificationWorkSchedule: Проверка ключа файла:', {
        levelId,
        zoneNumber,
        measurementLevel,
        measurementLevelType: typeof measurementLevel,
        expectedFileKey: expectedFileKeyForParsing,
        keysMatch: levelId === expectedFileKeyForParsing
      });

      // Находим название логгера
      const zone = measurementZones.find(z => z.zoneNumber === zoneNumber);
      const level = zone?.measurementLevels.find(l => l.level === measurementLevel);
      const loggerName = level?.equipmentName || `Логгер зона ${zoneNumber} уровень ${measurementLevel}`;

      console.log('QualificationWorkSchedule: Начинаем парсинг файла:', {
        fileName: file.name,
        fileExtension,
        zoneNumber,
        measurementLevel,
        loggerName,
        measurementZones: measurementZones.length,
        zone: zone ? 'найдена' : 'не найдена',
        level: level ? 'найден' : 'не найден',
        levelId,
        expectedFileKey: expectedFileKeyForParsing
      });

      // Устанавливаем статус парсинга
      setParsingStatus(prev => ({
        ...prev,
        [levelId]: 'parsing'
      }));

      // Устанавливаем прогресс парсинга
      setParsingProgress(prev => ({
        ...prev,
        [levelId]: 0
      }));

      // Выбираем парсер в зависимости от типа файла
      let parsedData;
      if (fileExtension === '.vi2') {
        console.log('Используем VI2 парсер');
        const vi2ParsingService = new VI2ParsingService();
        parsedData = await vi2ParsingService.parseFile(file);
      } else if (['.xls', '.xlsx'].includes(fileExtension)) {
        console.log('Используем XLS парсер');
        const arrayBuffer = await file.arrayBuffer();
        const xlsParser = new XLSParser(arrayBuffer);
        parsedData = await xlsParser.parse(file.name);
      } else {
        throw new Error(`Неподдерживаемый тип файла: ${fileExtension}`);
      }

      // Обновляем прогресс парсинга
      setParsingProgress(prev => ({
        ...prev,
        [levelId]: 50
      }));

      console.log('QualificationWorkSchedule: Парсинг завершен:', {
        fileName: parsedData.fileName,
        recordCount: parsedData.recordCount,
        parsingStatus: parsedData.parsingStatus,
        errorMessage: parsedData.errorMessage,
        hasMeasurements: parsedData.measurements && parsedData.measurements.length > 0,
        measurementsCount: parsedData.measurements?.length || 0
      });

      if (parsedData.parsingStatus === 'error') {
        const errorMsg = parsedData.errorMessage || 'Ошибка парсинга файла';
        console.error('QualificationWorkSchedule: Парсинг завершился с ошибкой:', errorMsg);
        throw new Error(errorMsg);
      }
      
      // Проверяем, что парсинг действительно завершился успешно
      if (parsedData.parsingStatus !== 'completed') {
        console.warn('QualificationWorkSchedule: Парсинг не завершен успешно, статус:', parsedData.parsingStatus);
        // Если статус не 'completed', но и не 'error', устанавливаем 'completed' вручную
        if (parsedData.measurements && parsedData.measurements.length > 0) {
          parsedData.parsingStatus = 'completed';
          console.log('QualificationWorkSchedule: Статус парсинга исправлен на completed, т.к. есть измерения');
        } else {
          throw new Error('Парсинг не завершился успешно и нет данных для сохранения');
        }
      }

      // Получаем projectId для сохранения данных
      let currentProjectId = projectId;
      if (!currentProjectId) {
        const urlParams = new URLSearchParams(window.location.search);
        currentProjectId = urlParams.get('projectId') || undefined;
      }
      
      if (!currentProjectId) {
        console.error('QualificationWorkSchedule: ProjectId не найден');
        throw new Error('ProjectId не найден для сохранения данных логгера');
      }
      
      console.log('QualificationWorkSchedule: ProjectId найден:', currentProjectId);
      
      // Сначала загружаем файл в Supabase Storage
      console.log('QualificationWorkSchedule: Загружаем файл в Storage:', file.name);
      setParsingProgress(prev => ({
        ...prev,
        [levelId]: 70
      }));
      
      const storageUrl = await qualificationObjectService.uploadLoggerRemovalFile(
        qualificationObjectId,
        zoneNumber,
        measurementLevel,
        file
      );
      
      console.log('QualificationWorkSchedule: Файл загружен в Storage:', storageUrl);

      // Сохраняем данные в базу данных
      setParsingProgress(prev => ({
        ...prev,
        [levelId]: 85
      }));
      
      console.log('QualificationWorkSchedule: Сохранение данных в БД:', {
        projectId: currentProjectId,
        qualificationObjectId,
        zoneNumber,
        measurementLevel,
        loggerName,
        fileName: parsedData.fileName,
        recordCount: parsedData.recordCount,
        parsingStatus: parsedData.parsingStatus
      });
      
      const saveResult = await loggerDataService.saveLoggerData(
        currentProjectId,
        qualificationObjectId,
        zoneNumber,
        measurementLevel,
        loggerName,
        parsedData
      );

      console.log('QualificationWorkSchedule: Результат сохранения в БД:', {
        success: saveResult.success,
        error: saveResult.error,
        recordCount: saveResult.recordCount
      });

      if (!saveResult.success) {
        const errorMsg = saveResult.error || 'Ошибка сохранения данных';
        console.error('QualificationWorkSchedule: Ошибка сохранения данных в БД:', errorMsg);
        throw new Error(errorMsg);
      }

      // Обновляем статус и результаты
      console.log('QualificationWorkSchedule: Устанавливаем локальный статус completed для:', levelId);
      console.log('QualificationWorkSchedule: fileKey (levelId):', levelId);
      console.log('QualificationWorkSchedule: zoneNumber:', zoneNumber, 'measurementLevel:', measurementLevel);
      
      // Проверяем, что ключ формируется правильно
      const expectedFileKey = getLoggerRemovalFileKey(zoneNumber, measurementLevel);
      console.log('QualificationWorkSchedule: Ожидаемый fileKey:', expectedFileKey);
      console.log('QualificationWorkSchedule: levelId совпадает с expectedFileKey?', levelId === expectedFileKey);
      
      // Используем правильный ключ (expectedFileKey), если levelId не совпадает
      const correctFileKey = expectedFileKey;
      if (levelId !== correctFileKey) {
        console.warn('QualificationWorkSchedule: levelId не совпадает с expectedFileKey, используем correctFileKey:', correctFileKey);
        console.warn('QualificationWorkSchedule: levelId:', levelId, 'vs correctFileKey:', correctFileKey);
      }
      
      setParsingProgress(prev => ({
        ...prev,
        [correctFileKey]: 100
      }));
      
      setParsingStatus(prev => {
        // Используем правильный ключ для обновления статуса
        const keyToUse = correctFileKey;
        const newStatus = {
          ...prev,
          [keyToUse]: 'completed' as const
        };
        console.log('QualificationWorkSchedule: Установлен статус completed для', keyToUse);
        console.log('QualificationWorkSchedule: Новый статус:', newStatus);
        console.log('QualificationWorkSchedule: Все ключи в новом статусе:', Object.keys(newStatus));
        return newStatus;
      });

      setParsingResults(prev => ({
        ...prev,
        [correctFileKey]: {
          recordCount: saveResult.recordCount || 0
        }
      }));

      setSuccess(`Файл ${file.name} успешно обработан и загружен. Сохранено ${saveResult.recordCount || 0} записей.`);
      setTimeout(() => setSuccess(null), 5000);

      // Обновляем файлы в Storage после успешной загрузки
      console.log('QualificationWorkSchedule: Перезагружаем файлы из Storage и БД...');
      console.log('QualificationWorkSchedule: Ожидаемый fileKey для обновления:', correctFileKey);
      console.log('QualificationWorkSchedule: zoneNumber:', zoneNumber, 'measurementLevel:', measurementLevel);
      
      // Увеличиваем задержку для обновления БД (БД может быть медленной)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Сохраняем текущий статус перед перезагрузкой
      const statusBeforeReload = parsingStatus[correctFileKey];
      console.log('QualificationWorkSchedule: Статус перед перезагрузкой для', correctFileKey, ':', statusBeforeReload);
      
      await loadLoggerRemovalFiles();
      
      // После загрузки проверяем, что статус обновился
      console.log('QualificationWorkSchedule: Перезагрузка завершена');
      console.log('QualificationWorkSchedule: Проверка статуса после перезагрузки для', correctFileKey);
      
      // Принудительно обновляем статус после загрузки, если он не обновился
      // Используем setTimeout для того, чтобы дать время React обновить состояние
      setTimeout(() => {
        setParsingStatus(prev => {
          const currentStatus = prev[correctFileKey];
          console.log('QualificationWorkSchedule: Текущий статус для', correctFileKey, 'после перезагрузки:', currentStatus);
          console.log('QualificationWorkSchedule: Все доступные ключи статусов:', Object.keys(prev));
          
          if (currentStatus !== 'completed') {
            console.warn('QualificationWorkSchedule: Статус не обновился после перезагрузки, принудительно устанавливаем completed');
            console.log('QualificationWorkSchedule: Все статусы:', prev);
            
            return {
              ...prev,
              [correctFileKey]: 'completed' as const
            };
          }
          return prev;
        });
        
        // Также обновляем результаты, если их нет
        setParsingResults(prev => {
          if (!prev[correctFileKey] || !prev[correctFileKey].recordCount) {
            console.log('QualificationWorkSchedule: Обновляем результаты для', correctFileKey);
            return {
              ...prev,
              [correctFileKey]: {
                recordCount: saveResult.recordCount || 0
              }
            };
          }
          return prev;
        });
      }, 1000);

    } catch (error) {
      console.error('QualificationWorkSchedule: Ошибка парсинга файла:', {
        levelId,
        fileName: file.name,
        fileExtension,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Устанавливаем статус ошибки
      setParsingStatus(prev => ({
        ...prev,
        [levelId]: 'error'
      }));

      setParsingResults(prev => ({
        ...prev,
        [levelId]: {
          recordCount: 0,
          error: error instanceof Error ? error.message : 'Неизвестная ошибка'
        }
      }));

      // Пытаемся сохранить информацию об ошибке в БД, если файл был загружен в Storage
      try {
        const parsed = parseLevelId(levelId);
        if (parsed && projectId) {
          const { zoneNumber, level: measurementLevel } = parsed;
          const zone = measurementZones.find(z => z.zoneNumber === zoneNumber);
          const level = zone?.measurementLevels.find(l => l.level === measurementLevel);
          const loggerName = level?.equipmentName || `Логгер зона ${zoneNumber} уровень ${measurementLevel}`;
          
          // Проверяем, был ли файл загружен в Storage
          const fileKey = getLoggerRemovalFileKey(zoneNumber, measurementLevel);
          const storageFile = storageFiles[fileKey];
          
          if (storageFile) {
            // Файл был загружен, но парсинг не удался - сохраняем ошибку в БД
            await loggerDataService.saveLoggerData(
              projectId,
              qualificationObjectId,
              zoneNumber,
              measurementLevel,
              loggerName,
              {
                fileName: file.name,
                deviceMetadata: {
                  deviceType: 0,
                  deviceModel: 'Unknown',
                  serialNumber: 'Unknown'
                },
                measurements: [],
                startDate: new Date(),
                endDate: new Date(),
                recordCount: 0,
                parsingStatus: 'error',
                errorMessage: error instanceof Error ? error.message : 'Неизвестная ошибка'
              }
            );
            console.log('QualificationWorkSchedule: Информация об ошибке сохранена в БД');
          }
        }
      } catch (dbError) {
        console.error('QualificationWorkSchedule: Ошибка сохранения информации об ошибке в БД:', dbError);
      }

      setError(`Ошибка обработки файла ${file.name}: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      
      // Перезагружаем файлы из Storage и БД для обновления статусов
      setTimeout(async () => {
        await loadLoggerRemovalFiles();
      }, 1000);
    }
  };

  // Сохранение файлов снятия логгеров
  const handleSaveLoggerRemovalFiles = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const uploadPromises = Object.entries(loggerRemovalFiles)
        .filter(([_, file]) => file !== null)
        .map(async ([fileKey, file]) => {
          if (!file) return;
          
          // Парсим ключ для получения номера зоны и уровня
          const match = fileKey.match(/zone-(\d+)-level-(\d+)/);
          if (!match) return;
          
          const zoneNumber = parseInt(match[1]);
          const level = parseInt(match[2]);
          
          // Загружаем файл
          const url = await qualificationObjectService.uploadLoggerRemovalFile(
            qualificationObjectId,
            zoneNumber,
            level,
            file
          );
          
          console.log(`Файл снятия логгеров загружен для зоны ${zoneNumber}, уровень ${level}:`, url);
        });

      await Promise.all(uploadPromises);
      
      // НЕ очищаем загруженные файлы - они должны оставаться в таблице для отображения
      // setLoggerRemovalFiles({});
      
      setSuccess('Данные логгеров успешно сохранены');
      
      // Очищаем сообщение об успехе через 3 секунды
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Ошибка сохранения файлов снятия логгеров:', error);
      setError(error instanceof Error ? error.message : 'Ошибка сохранения файлов снятия логгеров');
    } finally {
      setSaving(false);
    }
  };

  // Сохранение расписания
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Валидация дат
      for (const stage of stages) {
        if (stage.startDate && stage.endDate) {
          // Парсим даты в формате YYYY-MM-DD как локальное время
          // Создаем Date объекты, используя локальное время (не UTC)
          const startDateParts = stage.startDate.split('-');
          const endDateParts = stage.endDate.split('-');
          
          if (startDateParts.length === 3 && endDateParts.length === 3) {
            // Создаем Date объекты в локальном времени
            const startDate = new Date(
              parseInt(startDateParts[0]),
              parseInt(startDateParts[1]) - 1, // месяц начинается с 0
              parseInt(startDateParts[2])
            );
            const endDate = new Date(
              parseInt(endDateParts[0]),
              parseInt(endDateParts[1]) - 1, // месяц начинается с 0
              parseInt(endDateParts[2])
            );
            
            if (startDate > endDate) {
              throw new Error(`В этапе "${stage.name}" дата начала не может быть позже даты окончания`);
            }
          }
        }
      }

      // Проверяем доступность сервиса
      if (!qualificationWorkScheduleService.isAvailable()) {
        throw new Error('Сервис сохранения недоступен. Проверьте настройки Supabase.');
      }

      // Используем метод saveWorkSchedule для полного обновления расписания
      // Это удалит старые записи и создаст новые, что обеспечит корректное обновление
      const stagesToSave = stages.map(stage => ({
        stageName: stage.name,
        stageDescription: stage.description,
        startDate: stage.startDate && stage.startDate.trim() !== '' ? stage.startDate : undefined,
        endDate: stage.endDate && stage.endDate.trim() !== '' ? stage.endDate : undefined,
        isCompleted: stage.isCompleted,
        completedAt: stage.completedAt || undefined,
        completedBy: stage.completedBy || undefined,
        cancelledAt: stage.cancelledAt || undefined,
        cancelledBy: stage.cancelledBy || undefined,
        projectId: projectId // Добавляем привязку к проекту
      }));

      console.log('Сохранение расписания для объекта:', qualificationObjectId, 'проекта:', projectId);
      console.log('Этапы для сохранения:', stagesToSave);

      // Сохраняем расписание (это удалит старые записи и создаст новые)
      await qualificationWorkScheduleService.saveWorkSchedule(
        qualificationObjectId,
        stagesToSave,
        projectId
      );

      // Загружаем все этапы из БД для обновления локального состояния
      const allStages = await qualificationWorkScheduleService.getWorkSchedule(qualificationObjectId, projectId);
      console.log('Все этапы загружены из БД:', allStages);

      // Обновляем локальное состояние с данными из базы
      // Форматируем даты для input type="date" (YYYY-MM-DD)
      // Используем локальное время, чтобы избежать проблем с часовыми поясами
      const formatDateForInput = (date: string | Date | null | undefined): string => {
        if (!date) return '';
        if (typeof date === 'string') {
          // Если это ISO строка, извлекаем только дату (но нужно учесть часовой пояс)
          if (date.includes('T')) {
            // Парсим ISO строку и используем локальное время
            const d = new Date(date);
            if (!isNaN(d.getTime())) {
              const year = d.getFullYear();
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              return `${year}-${month}-${day}`;
            }
            // Если парсинг не удался, просто извлекаем дату из строки
            return date.split('T')[0];
          }
          // Если это уже в формате YYYY-MM-DD, возвращаем как есть
          if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return date;
          }
          // Пытаемся распарсить и отформатировать
          try {
            const d = new Date(date);
            if (!isNaN(d.getTime())) {
              // Используем локальное время вместо UTC
              const year = d.getFullYear();
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              return `${year}-${month}-${day}`;
            }
          } catch (e) {
            console.warn('Ошибка форматирования даты:', date, e);
          }
          return '';
        }
        if (date instanceof Date) {
          // Используем локальное время вместо UTC
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
        return '';
      };
      
      const updatedStages = allStages.map(stage => ({
        id: stage.id,
        name: stage.stageName,
        description: stage.stageDescription,
        startDate: formatDateForInput(stage.startDate),
        endDate: formatDateForInput(stage.endDate),
        isCompleted: stage.isCompleted,
        completedAt: stage.completedAt || undefined,
        completedBy: stage.completedBy || undefined,
        cancelledAt: stage.cancelledAt || undefined,
        cancelledBy: stage.cancelledBy || undefined
      }));
      setStages(updatedStages);
      
      setSuccess('Расписание квалификационных работ успешно сохранено');
      
      // Очищаем сообщение об успехе через 3 секунды
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Ошибка сохранения расписания:', error);
      setError(error instanceof Error ? error.message : 'Ошибка сохранения расписания');
    } finally {
      setSaving(false);
    }
  };

  // Обработка перехода к анализу данных
  const handleDataAnalysis = () => {
    console.log('QualificationWorkSchedule: handleDataAnalysis вызвана', {
      qualificationObjectId,
      projectId,
      project,
      parsingStatus,
      parsingResults,
      onPageChange: !!onPageChange
    });
    
    // Переходим на страницу анализа данных
    if (onPageChange) {
      onPageChange('data_analysis', {
        qualificationObjectId,
        projectId: projectId,
        project: project // Передаем полный объект проекта
      });
    } else {
      console.warn('QualificationWorkSchedule: onPageChange не определен - функция анализа данных недоступна');
      // Показываем уведомление пользователю с инструкцией
      alert('Функция анализа данных доступна только в разделе "Управление проектами".\n\nДля анализа данных:\n1. Перейдите в "Управление проектами"\n2. Выберите проект\n3. Откройте объект квалификации\n4. Нажмите "Анализ данных"');
    }
  };

  // Получение иконки для этапа
  const getStageIcon = (stage: QualificationWorkStage) => {
    if (stage.isCompleted) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (stage.startDate && stage.endDate) {
      return <Clock className="w-5 h-5 text-blue-500" />;
    } else {
      return <Calendar className="w-5 h-5 text-gray-400" />;
    }
  };

  // Получение цвета для этапа
  const getStageColor = (stage: QualificationWorkStage) => {
    if (stage.isCompleted) {
      return 'bg-green-50 border-green-200';
    } else if (stage.startDate && stage.endDate) {
      return 'bg-blue-50 border-blue-200';
    } else {
      return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center space-x-3 mb-6">
        <CalendarDays className="w-6 h-6 text-indigo-600" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">План график проведения квалификационных работ</h3>
          <p className="text-sm text-gray-500">{qualificationObjectName}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Ошибка</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Успешно</h3>
              <div className="mt-2 text-sm text-green-700">{success}</div>
            </div>
          </div>
        </div>
      )}

      {/* Индикатор загрузки */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка расписания...</p>
        </div>
      )}

      {/* Список этапов */}
      {!loading && (
        <div className="space-y-4">
          {(() => {
            console.log('QualificationWorkSchedule: Рендеринг этапов:', {
              stagesCount: stages.length,
              stageNames: stages.map(s => s.name)
            });
            return stages.map((stage, index) => (
          <div key={stage.id} className={`border rounded-lg p-4 relative ${getStageColor(stage)}`}>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 mt-1">
                {getStageIcon(stage)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">
                    {index + 1}. {stage.name}
                  </h4>
                  {(stage.isCompleted || stage.cancelledAt) && (
                    <div className="text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span>{stage.isCompleted ? stage.completedBy : stage.cancelledBy}</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {stage.isCompleted 
                          ? (stage.completedAt ? new Date(stage.completedAt).toLocaleString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : '')
                          : (stage.cancelledAt ? new Date(stage.cancelledAt).toLocaleString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : '')
                        }
                      </div>
                    </div>
                  )}
                  {/* Логирование для диагностики */}
                  {(() => {
                    console.log('QualificationWorkSchedule: Отображение этапа:', stage.name, {
                      isCompleted: stage.isCompleted,
                      completedAt: stage.completedAt,
                      completedBy: stage.completedBy,
                      cancelledAt: stage.cancelledAt,
                      cancelledBy: stage.cancelledBy,
                      shouldShowInfo: stage.isCompleted || stage.cancelledAt
                    });
                    return null;
                  })()}
                </div>
                
                <p className="text-sm text-gray-600 mb-4">{stage.description}</p>
                
                {isSingleDateStage(stage.name) ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Дата
                    </label>
                    <input
                      type="date"
                      value={stage.startDate}
                      onChange={(e) => handleSingleDateChange(stage.id, e.target.value)}
                      disabled={stage.isCompleted || mode === 'view'}
                      readOnly={mode === 'view'}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        stage.isCompleted || mode === 'view'
                          ? 'bg-gray-100 cursor-not-allowed border-gray-300' 
                          : 'border-gray-300'
                      }`}
                      title={`Дата этапа: ${stage.name}`}
                    />
                    
                    {/* Блок расстановки оборудования для этапа "Расстановка логгеров" */}
                    {stage.name === 'Расстановка логгеров' && (
                      <div className={`mt-4 ${stage.isCompleted || mode === 'view' ? 'pointer-events-none opacity-60' : ''}`}>
                        <EquipmentPlacement
                          qualificationObjectId={qualificationObjectId}
                          initialZones={measurementZones}
                          onZonesChange={handleZonesChange}
                          readOnly={mode === 'view'}
                        />
                      </div>
                    )}

                    {/* Блок снятия логгеров для этапа "Снятие логгеров" */}
                    {stage.name === 'Снятие логгеров' && (
                      <div className={`mt-4 ${stage.isCompleted || mode === 'view' ? 'pointer-events-none opacity-60' : ''}`}>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h5 className="text-sm font-medium text-gray-900">Файлы данных логгеров</h5>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">
                                Загружено: {Object.values(loggerRemovalFiles).filter(file => file !== null).length} из {measurementZones.reduce((total, zone) => total + zone.measurementLevels.length, 0)}
                              </span>
                              {measurementZones.length > 0 && (
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="progress-bar bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                    data-value={Math.min(100, Math.round((Object.values(loggerRemovalFiles).filter(file => file !== null).length / measurementZones.reduce((total, zone) => total + zone.measurementLevels.length, 0)) * 100))}
                                  ></div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {measurementZones.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      № Зоны измерения
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Уровень
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Наименование
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Наименование файла
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Статус
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Действие
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {measurementZones.map((zone) =>
                                    zone.measurementLevels.map((level) => {
                                      const fileKey = getLoggerRemovalFileKey(zone.zoneNumber, level.level);
                                      const file = loggerRemovalFiles[fileKey];
                                      const storageFile = storageFiles[fileKey];
                                      
                                      // Отладочная информация
                                      console.log(`Рендеринг строки для ${fileKey}:`, {
                                        fileKey,
                                        hasFile: !!file,
                                        hasStorageFile: !!storageFile,
                                        parsingStatus: parsingStatus[fileKey],
                                        parsingProgress: parsingProgress[fileKey],
                                        parsingResults: parsingResults[fileKey]
                                      });
                                      
                                      return (
                                        <tr key={`${zone.id}-${level.id}`}>
                                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                            {zone.zoneNumber === 0 ? 'Внешняя температура' : `Зона №${zone.zoneNumber}`}
                                          </td>
                                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                            {level.level}
                                          </td>
                                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                            {level.equipmentName ? (
                                              <span className="text-gray-900">{level.equipmentName}</span>
                                            ) : (
                                              <span className="text-gray-400 italic">Не назначен</span>
                                            )}
                                          </td>
                                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                                            {storageFile ? (
                                              <div className="space-y-1">
                                                <div className="flex items-center space-x-2">
                                                  <FileText className="w-4 h-4 text-gray-600" />
                                                  <span className="truncate max-w-xs">{storageFile.name}</span>
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                  Размер: {(storageFile.size / 1024).toFixed(1)} KB
                                                </div>
                                                {parsingStatus[fileKey] === 'parsing' && parsingProgress[fileKey] !== undefined && (
                                                  <div className="text-xs">
                                                    <div className="parsing-progress-bar">
                                                      <div 
                                                        className="parsing-progress-fill"
                                                        style={{ width: `${parsingProgress[fileKey]}%` }}
                                                        title={`Прогресс обработки: ${parsingProgress[fileKey]}%`}
                                                        aria-label={`Прогресс обработки: ${parsingProgress[fileKey]}%`}
                                                      ></div>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            ) : file ? (
                                              <div className="space-y-1">
                                                <div className="flex items-center space-x-2">
                                                  {getFileIcon(file)}
                                                  <span className="truncate max-w-xs">{file.name}</span>
                                                </div>
                                                {parsingStatus[fileKey] === 'parsing' && parsingProgress[fileKey] !== undefined && (
                                                  <div className="text-xs">
                                                    <div className="parsing-progress-bar">
                                                      <div 
                                                        className="parsing-progress-fill"
                                                        style={{ width: `${parsingProgress[fileKey]}%` }}
                                                        title={`Прогресс обработки: ${parsingProgress[fileKey]}%`}
                                                        aria-label={`Прогресс обработки: ${parsingProgress[fileKey]}%`}
                                                      ></div>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            ) : (
                                              <span className="text-gray-400">Файл не загружен</span>
                                            )}
                                          </td>
                                          <td className="px-3 py-2 whitespace-nowrap">
                                            {(() => {
                                              // Определяем актуальный статус
                                              if (!storageFile && !file) {
                                                return (
                                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                    Не загружен
                                                  </span>
                                                );
                                              }
                                              
                                              if (parsingStatus[fileKey] === 'parsing') {
                                                return (
                                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                                                    Обработка
                                                  </span>
                                                );
                                              }
                                              
                                              if (parsingStatus[fileKey] === 'completed') {
                                                return (
                                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    <div className="w-3 h-3 bg-green-600 rounded-full mr-1"></div>
                                                    Обработан
                                                    {parsingResults[fileKey]?.recordCount && (
                                                      <span className="ml-1 text-xs opacity-75">
                                                        ({parsingResults[fileKey].recordCount} записей)
                                                      </span>
                                                    )}
                                                  </span>
                                                );
                                              }
                                              
                                              if (parsingStatus[fileKey] === 'error') {
                                                return (
                                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    ✗ Ошибка
                                                    {parsingResults[fileKey]?.error && (
                                                      <span className="ml-1 text-xs opacity-75" title={parsingResults[fileKey].error}>
                                                        (детали)
                                                      </span>
                                                    )}
                                                  </span>
                                                );
                                              }
                                              
                                              // Проверяем, есть ли статус в БД (может быть не загружен еще)
                                              // Если файл есть в Storage, но статус undefined, значит он еще не обработан
                                              const hasStatus = parsingStatus[fileKey] !== undefined;
                                              
                                              // Отладочная информация
                                              if (storageFile && !hasStatus) {
                                                console.warn('QualificationWorkSchedule: Файл в Storage, но нет статуса для', fileKey, {
                                                  fileKey,
                                                  storageFile: storageFile.name,
                                                  parsingStatusKeys: Object.keys(parsingStatus),
                                                  parsingStatusValues: Object.values(parsingStatus)
                                                });
                                              }
                                              
                                              if (!hasStatus && storageFile) {
                                                // Файл загружен, но статус еще не загружен из БД - показываем как "Ожидает обработки"
                                                return (
                                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                    Ожидает обработки
                                                  </span>
                                                );
                                              }
                                              
                                              // Файл загружен, но не обработан (статус не 'completed' и не 'parsing')
                                              // Проверяем, может быть статус 'processing' в БД
                                              // Удаляем эту проверку, так как она вызывает ошибки типизации
                                              // const currentStatus = parsingStatus[fileKey];
                                              // if (hasStatus && currentStatus !== undefined && 
                                              //     currentStatus !== 'completed' && 
                                              //     currentStatus !== 'parsing' && 
                                              //     currentStatus !== 'error' && 
                                              //     currentStatus !== 'processing') {
                                              //   console.warn('QualificationWorkSchedule: Неожиданный статус для', fileKey, ':', currentStatus);
                                              // }
                                              
                                              return (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                  Ожидает обработки
                                                </span>
                                              );
                                            })()}
                                          </td>
                                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center space-x-2">
                                              {mode !== 'view' && !stage.isCompleted && (
                                                <>
                                                  <label className="cursor-pointer">
                                                    <input
                                                      type="file"
                                                      accept=".vi2,.csv,.xls,.xlsx,.pdf"
                                                      onChange={(e) => handleLoggerRemovalFileUpload(fileKey, e)}
                                                      className="hidden"
                                                      disabled={stage.isCompleted}
                                                    />
                                                    <span className={`inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded ${
                                                      stage.isCompleted 
                                                        ? 'text-gray-400 bg-gray-100 cursor-not-allowed' 
                                                        : 'text-indigo-700 bg-indigo-100 hover:bg-indigo-200'
                                                    }`}>
                                                      <Upload className="w-3 h-3 mr-1" />
                                                      {storageFile || file ? 'Заменить' : 'Загрузить'}
                                                    </span>
                                                  </label>
                                                  {/* Кнопка повторной обработки для файлов в статусе "Ожидает обработки" или "Ошибка" */}
                                                  {storageFile && (() => {
                                                    const status = parsingStatus[fileKey];
                                                    const canRetry = status === undefined || 
                                                                    status === 'error' || 
                                                                    status === 'processing' ||
                                                                    (status !== 'parsing' && status !== 'completed');
                                                    const isProcessing = status === 'parsing' || status === 'processing';
                                                    
                                                    return canRetry ? (
                                                      <button
                                                        onClick={async () => {
                                                          try {
                                                            // Загружаем файл из Storage для повторной обработки
                                                            const response = await fetch(storageFile.url);
                                                            const blob = await response.blob();
                                                            const fileName = storageFile.name || `file-${fileKey}`;
                                                            const file = new File([blob], fileName, { type: blob.type });
                                                            
                                                            // Определяем расширение файла
                                                            const fileExtension = '.' + fileName.split('.').pop()?.toLowerCase();
                                                            
                                                            // Запускаем парсинг
                                                            if (['.vi2', '.xls', '.xlsx'].includes(fileExtension)) {
                                                              await handleFileParsing(fileKey, file, fileExtension);
                                                            } else {
                                                              setError('Файл не поддерживает автоматическую обработку');
                                                            }
                                                          } catch (error) {
                                                            console.error('Ошибка повторной обработки файла:', error);
                                                            setError(`Ошибка повторной обработки файла: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
                                                          }
                                                        }}
                                                        disabled={isProcessing}
                                                        className={`inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded ${
                                                          isProcessing
                                                            ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                                                            : 'text-green-700 bg-green-100 hover:bg-green-200'
                                                        }`}
                                                        title="Повторить обработку файла"
                                                      >
                                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                        </svg>
                                                        Повторить
                                                      </button>
                                                    ) : null;
                                                  })()}
                                                </>
                                              )}
                                              {storageFile && (
                                                <a
                                                  href={storageFile.url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
                                                >
                                                  <FileText className="w-3 h-3 mr-1" />
                                                  Скачать
                                                </a>
                                              )}
                                              {mode !== 'view' && !stage.isCompleted && (storageFile || file) && (
                                                <button
                                                  onClick={async () => await removeLoggerRemovalFile(fileKey)}
                                                  disabled={stage.isCompleted}
                                                  className={`inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded ${
                                                    stage.isCompleted 
                                                      ? 'text-gray-400 bg-gray-100 cursor-not-allowed' 
                                                      : 'text-red-700 bg-red-100 hover:bg-red-200'
                                                  }`}
                                                >
                                                  <X className="w-3 h-3 mr-1" />
                                                  Удалить
                                                </button>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })
                                  )}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <p className="text-sm text-gray-500">
                                Сначала добавьте зоны измерения в блоке "Расстановка логгеров"
                              </p>
                            </div>
                          )}
                          
                          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <h6 className="text-sm font-medium text-blue-900 mb-1">Информация о файлах снятия логгеров:</h6>
                            <ul className="text-xs text-blue-700 space-y-1">
                              <li>В колонке Наименование отображается название логгера</li>
                              <li>Загрузите файлы, подтверждающие снятие логгеров с каждого уровня</li>
                              <li>Поддерживаются файлы: .vi2, .csv, .xls, .xlsx, .pdf</li>
                              <li>Файлы .vi2, .xls, .xlsx автоматически обрабатываются и сохраняются в базу данных для анализа</li>
                              <li>XLS файлы должны содержать колонки с датой/временем и температурой (влажность опционально)</li>
                              <li>Поддерживается структура данных логгера с метаданными в верхней части файла</li>
                              <li>Максимальный размер файла: 10 MB</li>
                              <li>Файлы должны содержать данные логгеров или информацию о демонтаже</li>
                            </ul>
                          </div>
                          
                          {/* Кнопка сохранения файлов снятия логгеров */}
                          <div className="mt-4 flex justify-end">
                            <button
                              onClick={handleSaveLoggerRemovalFiles}
                              disabled={saving || stage.isCompleted || mode === 'view' || Object.values(loggerRemovalFiles).every(file => file === null)}
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {saving ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Сохранение...
                                </>
                              ) : (
                                <>
                                  <Save className="w-4 h-4 mr-2" />
                                  Сохранить данные логгеров
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Дата начала
                      </label>
                      <input
                        type="date"
                        value={stage.startDate}
                        onChange={(e) => handleDateChange(stage.id, 'startDate', e.target.value)}
                        disabled={stage.isCompleted || mode === 'view'}
                        readOnly={mode === 'view'}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          stage.isCompleted || mode === 'view'
                            ? 'bg-gray-100 cursor-not-allowed border-gray-300' 
                            : 'border-gray-300'
                        }`}
                        title={`Дата начала этапа: ${stage.name}`}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Дата окончания
                      </label>
                      <input
                        type="date"
                        value={stage.endDate}
                        onChange={(e) => handleDateChange(stage.id, 'endDate', e.target.value)}
                        disabled={stage.isCompleted || mode === 'view'}
                        readOnly={mode === 'view'}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          stage.isCompleted || mode === 'view'
                            ? 'bg-gray-100 cursor-not-allowed border-gray-300' 
                            : 'border-gray-300'
                        }`}
                        title={`Дата окончания этапа: ${stage.name}`}
                      />
                    </div>
                  </div>
                )}
                
                {/* Кнопки "Завершено"/"Отмена" и "Анализ данных" отдельно от полей дат - скрыты в режиме просмотра */}
                {mode !== 'view' && (
                  <div className="mt-4 flex justify-end space-x-3">
                    <button
                      onClick={() => handleStageCompletion(stage.id)}
                      disabled={stageCompletionLoading[stage.id] || !canCompleteStage(stage)}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                        stage.isCompleted 
                          ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                          : canCompleteStage(stage)
                            ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                            : 'bg-gray-400 cursor-not-allowed'
                      }`}
                      title={!canCompleteStage(stage) && !stage.isCompleted ? 'Заполните даты для завершения этапа' : ''}
                    >
                      {stageCompletionLoading[stage.id] ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Сохранение...
                        </>
                      ) : stage.isCompleted ? (
                        <>
                          <XCircle className="w-4 h-4 mr-2" />
                          Отмена
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Завершено
                        </>
                      )}
                    </button>
                  
                  {/* Кнопка "Анализ данных" - показывается для этапа "Снятие логгеров" (скрыта в режиме просмотра) */}
                  {(mode === 'edit' || !mode) && stage.name === 'Снятие логгеров' && (() => {
                    // Проверяем, есть ли обработанные файлы
                    const hasProcessedFiles = Object.keys(parsingStatus).some(fileKey => 
                      parsingStatus[fileKey] === 'completed' && parsingResults[fileKey]?.recordCount > 0
                    );
                    
                    // Кнопка "Анализ данных" доступна независимо от статуса завершения этапа
                    return hasProcessedFiles ? (
                      <button
                        onClick={() => handleDataAnalysis()}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg"
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Анализ данных
                      </button>
                    ) : (
                      <button
                        disabled
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-400 bg-gray-300 cursor-not-allowed"
                        title="Для анализа данных необходимо загрузить и обработать файлы логгеров"
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Анализ данных
                      </button>
                    );
                  })()}
                </div>
                )}
                
              </div>
            </div>
          </div>
        ));
          })()}
        </div>
      )}

      {/* Кнопка "Сохранить План график" после всех этапов - скрыта в режиме просмотра */}
      {!loading && mode !== 'view' && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 shadow-lg"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Сохранение...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Сохранить План график
              </>
            )}
          </button>
        </div>
      )}

      {/* Проверка наличия документации - второй пункт */}
      {!loading && projectId && (
        <div className="mt-6">
          <DocumentationCheckComponent
            qualificationObjectId={qualificationObjectId}
            projectId={projectId}
            onSave={(check) => {
              console.log('Проверка документации сохранена:', check);
              setSuccess('Проверка документации сохранена');
            }}
          />
        </div>
      )}

      {/* Документы по испытанию */}
      {!loading && !hideTestDocuments && (
        <div className="mt-6 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-4">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h4 className="text-lg font-semibold text-gray-900">Документы по испытанию</h4>
          </div>
          
          <p className="text-sm text-gray-600 mb-4">
            Загрузите документы в формате PDF и изображения, связанные с проведением испытаний по данному объекту квалификации в рамках проекта.
          </p>

          {/* Загрузка файлов */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Выберите файлы для загрузки
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.webp"
                onChange={handleDocumentUpload}
                title="Выберите файлы для загрузки"
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Поддерживаются: PDF документы, изображения (JPG, PNG, GIF, BMP, WebP)
            </p>
          </div>

          {/* Список загруженных документов */}
          {testDocuments.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-gray-700">Загруженные документы:</h5>
              <div className="space-y-2">
                {testDocuments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <div className="flex items-center space-x-3">
                      {getFileIcon(file)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDocument(index)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                      title="Удалить файл"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Информация о документах */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h6 className="text-sm font-medium text-blue-900 mb-1">Информация о документах:</h6>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Документы должны быть связаны с проведением испытаний данного объекта квалификации</li>
              <li>• Поддерживаются PDF документы и изображения</li>
              <li>• Максимальный размер файла: 10 MB</li>
              <li>• Документы будут привязаны к объекту квалификации в рамках проекта</li>
            </ul>
          </div>
        </div>
      )}

      {/* Информация о расписании */}
      {!loading && !hideTestDocuments && (
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Информация о расписании:</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Для некоторых этапов (расстановка/снятие логгеров, восстановление температуры) установите только дату</li>
            <li>• Для остальных этапов установите даты начала и окончания</li>
            <li>• Отметьте этапы как завершенные после их выполнения</li>
            <li>• Даты начала не могут быть позже дат окончания</li>
            <li>• Нажмите "Сохранить" для сохранения изменений в базе данных</li>
            <li>• Расписание автоматически загружается при открытии объекта</li>
          </ul>
        </div>
      )}

      {/* Кнопка сохранения - скрыта в режиме просмотра */}
      {!loading && mode !== 'view' && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Сохранение...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Сохранить
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
