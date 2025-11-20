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
      const measurements = await databaseService.getMeasurements(file.id);
      if (!measurements || measurements.length === 0) {
        console.warn(`No measurements found for file: ${file.name}`);
        return [];
      }

      // Преобразуем все данные без сэмплирования для отображения всех точек
      const points: TimeSeriesPoint[] = measurements.map((measurement, index) => ({
        timestamp: measurement.timestamp.getTime(),
        temperature: measurement.temperature,
        humidity: measurement.humidity,
        fileId: file.name, // Используем имя файла для связи
        originalIndex: index,
        zoneNumber: file.zoneNumber
      }));

      return points;
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
        const records = await loggerDataService.getLoggerData(projectId, qualificationObjectId, summary.zone_number, summary.measurement_level);
        
        if (records && records.length > 0) {
          const points: TimeSeriesPoint[] = records.map((record: any, index: number) => ({
            timestamp: new Date(record.timestamp).getTime(),
            temperature: record.temperature,
            humidity: record.humidity,
            fileId: `zone-${summary.zone_number}-level-${summary.measurement_level}`,
            originalIndex: index,
            zoneNumber: summary.zone_number,
            measurementLevel: summary.measurement_level,
            deviceSerialNumber: record.device_serial_number || 'Unknown',
            serialNumber: (summary.serial_number && !summary.serial_number.startsWith('XLS-Logger-')) ? summary.serial_number : 'Не указан', // Серийный номер из справочника оборудования
            loggerName: summary.logger_name || `Логгер зона ${summary.zone_number} уровень ${summary.measurement_level}`
          }));
          
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
      const temperatures = allPoints.filter(p => p.temperature !== undefined).map(p => p.temperature!);
      const humidities = allPoints.filter(p => p.humidity !== undefined).map(p => p.humidity!);
      const timestamps = allPoints.map(p => p.timestamp);

      const hasTemperature = temperatures.length > 0;
      const hasHumidity = humidities.length > 0;

      const processedData: ProcessedTimeSeriesData = {
        points: allPoints,
        temperatureRange: hasTemperature ? 
          [Math.min(...temperatures), Math.max(...temperatures)] : [0, 100],
        humidityRange: hasHumidity ? 
          [Math.min(...humidities), Math.max(...humidities)] : [0, 100],
        timeRange: [Math.min(...timestamps), Math.max(...timestamps)],
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
      
    } catch (error) {
      console.error('Error loading data from database:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
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
      const temperatures = allPoints.filter(p => p.temperature !== undefined).map(p => p.temperature!);
      const humidities = allPoints.filter(p => p.humidity !== undefined).map(p => p.humidity!);
      const timestamps = allPoints.map(p => p.timestamp);

      const hasTemperature = temperatures.length > 0;
      const hasHumidity = humidities.length > 0;

      const processedData: ProcessedTimeSeriesData = {
        points: allPoints,
        temperatureRange: hasTemperature ? 
          [Math.min(...temperatures), Math.max(...temperatures)] : [0, 100],
        humidityRange: hasHumidity ? 
          [Math.min(...humidities), Math.max(...humidities)] : [0, 100],
        timeRange: [Math.min(...timestamps), Math.max(...timestamps)],
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