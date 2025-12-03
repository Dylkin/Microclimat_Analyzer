import { useState, useEffect, useCallback, useMemo } from 'react';
import { UploadedFile } from '../types/FileData';
import { TimeSeriesPoint, ProcessedTimeSeriesData } from '../types/TimeSeriesData';
import { databaseService } from '../utils/database';

interface UseTimeSeriesDataProps {
  files: UploadedFile[];
  qualificationObjectId?: string;
  projectId?: string;
}

export const useTimeSeriesData = ({ files, qualificationObjectId, projectId }: UseTimeSeriesDataProps) => {
  const [data, setData] = useState<ProcessedTimeSeriesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const processFileData = useCallback(async (file: UploadedFile): Promise<TimeSeriesPoint[]> => {
    try {
      // В текущей реализации измерения из локальной "БД" не используются.
      // Источник данных — loggerDataService (loadDataFromDatabase).
      // Оставляем заглушку, чтобы не ломать сигнатуру хука.
      console.warn(`processFileData (stub) called for file: ${file.name}`);
      return [];
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      return [];
    }
  }, []);

  // Загрузка данных из базы данных
  const loadDataFromDatabase = useCallback(async () => {
    if (!qualificationObjectId || !projectId) {
      console.log('useTimeSeriesData: Missing qualificationObjectId or projectId');
      return;
    }

    console.log('useTimeSeriesData: Loading data from database', { qualificationObjectId, projectId });

    try {
      // Импортируем loggerDataService динамически, чтобы избежать циклических зависимостей
      const { loggerDataService } = await import('../utils/loggerDataService');
      
      // Загружаем сводные данные
      const summaries = await loggerDataService.getLoggerDataSummary(projectId, qualificationObjectId);
      console.log('useTimeSeriesData: Loaded summaries:', summaries);
      
      if (!summaries || summaries.length === 0) {
        console.warn('useTimeSeriesData: No logger data summaries found for the specified object');
        setData(null);
        return;
      }

      // Загружаем детальные данные для каждого файла
      const allPoints: TimeSeriesPoint[] = [];
      
      for (const summary of summaries) {
        // Обрабатываем zone_number: null как 0 (зона "Внешний датчик")
        // Пропускаем только записи с null measurement_level
        if (summary.measurement_level === null || summary.measurement_level === undefined) {
          console.warn('useTimeSeriesData: Пропущена запись с null measurement_level:', {
            zone_number: summary.zone_number,
            measurement_level: summary.measurement_level,
            file_name: summary.file_name
          });
          continue;
        }
        
        // Нормализуем zone_number: null -> 0 (для зоны "Внешний датчик")
        const normalizedZoneNumber = summary.zone_number === null || summary.zone_number === undefined 
          ? 0 
          : summary.zone_number;
        
        const records = await loggerDataService.getLoggerData(
          projectId, 
          qualificationObjectId, 
          normalizedZoneNumber, 
          summary.measurement_level
        );
        
        if (records && records.length > 0) {
          const points: TimeSeriesPoint[] = records.map((record: any, index: number) => {
            // Нормализуем значения температуры и влажности (null/undefined -> undefined)
            const temperature = record.temperature !== null && record.temperature !== undefined 
              ? (typeof record.temperature === 'string' ? parseFloat(record.temperature) : record.temperature)
              : undefined;
            const humidity = record.humidity !== null && record.humidity !== undefined
              ? (typeof record.humidity === 'string' ? parseFloat(record.humidity) : record.humidity)
              : undefined;
            
            return {
              timestamp: new Date(record.timestamp).getTime(),
              temperature: !isNaN(temperature as number) && isFinite(temperature as number) ? temperature : undefined,
              humidity: !isNaN(humidity as number) && isFinite(humidity as number) ? humidity : undefined,
              fileId: `zone-${summary.zone_number}-level-${summary.measurement_level}`,
              originalIndex: index,
              zoneNumber: summary.zone_number,
              measurementLevel: summary.measurement_level,
              deviceSerialNumber: record.device_serial_number || 'Unknown',
              serialNumber: (summary.serial_number && 
                             !summary.serial_number.startsWith('XLS-Logger-') && 
                             summary.serial_number !== 'Не указан' &&
                             summary.serial_number.trim() !== '') 
                             ? summary.serial_number 
                             : 'Не указан', // Серийный номер только из справочника оборудования (measurement_equipment)
              loggerName: summary.logger_name || `Логгер зона ${summary.zone_number} уровень ${summary.measurement_level}`
            };
          });
          
          // Логируем статистику по температуре для отладки
          const tempCount = points.filter(p => p.temperature !== undefined && p.temperature !== null).length;
          if (tempCount === 0) {
            console.warn(`useTimeSeriesData: No valid temperature data for zone ${summary.zone_number} level ${summary.measurement_level}`, {
              totalRecords: records.length,
              recordsWithTemp: records.filter((r: any) => r.temperature !== null && r.temperature !== undefined).length
            });
          } else {
            console.log(`useTimeSeriesData: Loaded ${tempCount} temperature points for zone ${summary.zone_number} level ${summary.measurement_level}`);
          }
          
          allPoints.push(...points);
        }
      }

      if (allPoints.length === 0) {
        console.warn('No measurement records found');
        setData(null);
        return;
      }

      // Обрабатываем данные так же, как и файлы
      // Сортируем по времени
      allPoints.sort((a, b) => a.timestamp - b.timestamp);

      console.log(`Всего загружено точек данных из БД: ${allPoints.length}`);
      
      // Вычисляем диапазоны и проверяем наличие данных
      // Используем итеративный подход для больших массивов, чтобы избежать переполнения стека
      let minTemp = Infinity;
      let maxTemp = -Infinity;
      let minHumidity = Infinity;
      let maxHumidity = -Infinity;
      let minTimestamp = Infinity;
      let maxTimestamp = -Infinity;
      let hasTemperature = false;
      let hasHumidity = false;

      for (const point of allPoints) {
        // Обрабатываем температуру
        if (point.temperature !== undefined) {
          hasTemperature = true;
          if (point.temperature < minTemp) minTemp = point.temperature;
          if (point.temperature > maxTemp) maxTemp = point.temperature;
        }
        
        // Обрабатываем влажность
        if (point.humidity !== undefined) {
          hasHumidity = true;
          if (point.humidity < minHumidity) minHumidity = point.humidity;
          if (point.humidity > maxHumidity) maxHumidity = point.humidity;
        }
        
        // Обрабатываем время
        if (point.timestamp < minTimestamp) minTimestamp = point.timestamp;
        if (point.timestamp > maxTimestamp) maxTimestamp = point.timestamp;
      }

      const processedData: ProcessedTimeSeriesData = {
        points: allPoints,
        temperatureRange: hasTemperature ? 
          [minTemp === Infinity ? 0 : minTemp, maxTemp === -Infinity ? 100 : maxTemp] : [0, 100],
        humidityRange: hasHumidity ? 
          [minHumidity === Infinity ? 0 : minHumidity, maxHumidity === -Infinity ? 100 : maxHumidity] : [0, 100],
        timeRange: [minTimestamp === Infinity ? 0 : minTimestamp, maxTimestamp === -Infinity ? 0 : maxTimestamp],
        hasTemperature,
        hasHumidity
      };

      console.log('Time range:', new Date(processedData.timeRange[0]), 'to', new Date(processedData.timeRange[1]));
      console.log('Temperature range:', processedData.temperatureRange);
      console.log('Humidity range:', processedData.humidityRange);
      console.log('Has temperature:', hasTemperature);
      console.log('Has humidity:', hasHumidity);

      console.log('useTimeSeriesData: Setting processed data from database:', processedData);
      setData(processedData);
      setLoading(false);
      setProgress(100);
      
    } catch (error) {
      console.error('Error loading data from database:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      setLoading(false);
      setProgress(0);
    }
  }, [qualificationObjectId, projectId]);

  const loadData = useCallback(async () => {
    console.log('useTimeSeriesData: loadData called', { 
      filesCount: files.length, 
      qualificationObjectId, 
      projectId 
    });

    // Если нет файлов и нет данных для загрузки из базы, очищаем данные
    if (files.length === 0 && (!qualificationObjectId || !projectId)) {
      console.log('useTimeSeriesData: No files and no database params, clearing data');
      setData(null);
      return;
    }

    setLoading(true);
    setProgress(0);
    setError(null);

    try {
      // Если есть qualificationObjectId и projectId, загружаем данные из базы
      if (qualificationObjectId && projectId) {
        console.log('useTimeSeriesData: Loading from database');
        await loadDataFromDatabase();
        return;
      }

      // Иначе обрабатываем файлы как обычно
      const allPoints: TimeSeriesPoint[] = [];
      const completedFiles = files.filter(f => f.parsingStatus === 'completed');

      console.log(`Loading data from ${completedFiles.length} files...`);

      // Параллельная загрузка файлов батчами по 20 для оптимизации
      const batchSize = 20;
      for (let i = 0; i < completedFiles.length; i += batchSize) {
        const batch = completedFiles.slice(i, i + batchSize);
        const batchPromises = batch.map(file => processFileData(file));
        const batchResults = await Promise.all(batchPromises);
        
        batchResults.forEach(points => {
          allPoints.push(...points);
        });

        setProgress(Math.min(100, ((i + batchSize) / completedFiles.length) * 100));
      }

      if (allPoints.length === 0) {
        throw new Error('No data points loaded from files');
      }

      // Сортируем по времени
      allPoints.sort((a, b) => a.timestamp - b.timestamp);

      console.log(`Всего загружено точек данных: ${allPoints.length}`);
      console.log(`Файлов обработано: ${completedFiles.length}`);
      
      // Вычисляем диапазоны и проверяем наличие данных
      // Используем итеративный подход для больших массивов, чтобы избежать переполнения стека
      let minTemp = Infinity;
      let maxTemp = -Infinity;
      let minHumidity = Infinity;
      let maxHumidity = -Infinity;
      let minTimestamp = Infinity;
      let maxTimestamp = -Infinity;
      let hasTemperature = false;
      let hasHumidity = false;

      for (const point of allPoints) {
        // Обрабатываем температуру
        if (point.temperature !== undefined) {
          hasTemperature = true;
          if (point.temperature < minTemp) minTemp = point.temperature;
          if (point.temperature > maxTemp) maxTemp = point.temperature;
        }
        
        // Обрабатываем влажность
        if (point.humidity !== undefined) {
          hasHumidity = true;
          if (point.humidity < minHumidity) minHumidity = point.humidity;
          if (point.humidity > maxHumidity) maxHumidity = point.humidity;
        }
        
        // Обрабатываем время
        if (point.timestamp < minTimestamp) minTimestamp = point.timestamp;
        if (point.timestamp > maxTimestamp) maxTimestamp = point.timestamp;
      }

      const processedData: ProcessedTimeSeriesData = {
        points: allPoints,
        temperatureRange: hasTemperature ? 
          [minTemp === Infinity ? 0 : minTemp, maxTemp === -Infinity ? 100 : maxTemp] : [0, 100],
        humidityRange: hasHumidity ? 
          [minHumidity === Infinity ? 0 : minHumidity, maxHumidity === -Infinity ? 100 : maxHumidity] : [0, 100],
        timeRange: [minTimestamp === Infinity ? 0 : minTimestamp, maxTimestamp === -Infinity ? 0 : maxTimestamp],
        hasTemperature,
        hasHumidity
      };

      console.log('Time range:', new Date(processedData.timeRange[0]), 'to', new Date(processedData.timeRange[1]));
      console.log('Temperature range:', processedData.temperatureRange);
      console.log('Humidity range:', processedData.humidityRange);
      console.log('Has temperature:', hasTemperature);
      console.log('Has humidity:', hasHumidity);

      setData(processedData);
    } catch (error) {
      console.error('Error loading time series data:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
      setProgress(100);
    }
  }, [files, processFileData, qualificationObjectId, projectId, loadDataFromDatabase]);

  // Автоматическая загрузка при изменении файлов
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    data,
    loading,
    progress,
    error,
    reload: loadData
  };
};