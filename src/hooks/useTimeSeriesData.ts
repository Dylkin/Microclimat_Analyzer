import { useState, useEffect, useCallback, useMemo } from 'react';
import { UploadedFile } from '../types/FileData';
import { TimeSeriesPoint, ProcessedTimeSeriesData } from '../types/TimeSeriesData';
import { databaseService } from '../utils/database';

interface UseTimeSeriesDataProps {
  files: UploadedFile[];
}

export const useTimeSeriesData = ({ files }: UseTimeSeriesDataProps) => {
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

      // Отображаем все данные без сэмплирования
      const points: TimeSeriesPoint[] = [];

      for (let i = 0; i < measurements.length; i++) {
        const measurement = measurements[i];
        points.push({
          timestamp: measurement.timestamp.getTime(),
          temperature: measurement.temperature,
          humidity: measurement.humidity,
          fileId: file.id,
          originalIndex: i
        });
      }

      return points;
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      return [];
    }
  }, []);

  const loadData = useCallback(async () => {
    if (files.length === 0) {
      setData(null);
      return;
    }

    setLoading(true);
    setProgress(0);
    setError(null);

    try {
      const allPoints: TimeSeriesPoint[] = [];
      const completedFiles = files.filter(f => f.parsingStatus === 'completed');

      console.log(`Loading data from ${completedFiles.length} files...`);

      // Параллельная загрузка файлов батчами по 10
      const batchSize = 10;
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

      // Вычисляем диапазоны
      const temperatures = allPoints.filter(p => p.temperature !== undefined).map(p => p.temperature!);
      const humidities = allPoints.filter(p => p.humidity !== undefined).map(p => p.humidity!);
      const timestamps = allPoints.map(p => p.timestamp);

      const processedData: ProcessedTimeSeriesData = {
        points: allPoints,
        temperatureRange: temperatures.length > 0 ? 
          [Math.min(...temperatures), Math.max(...temperatures)] : [0, 100],
        humidityRange: humidities.length > 0 ? 
          [Math.min(...humidities), Math.max(...humidities)] : [0, 100],
        timeRange: [Math.min(...timestamps), Math.max(...timestamps)]
      };

      console.log(`Loaded ${allPoints.length} data points`);
      console.log('Time range:', new Date(processedData.timeRange[0]), 'to', new Date(processedData.timeRange[1]));
      console.log('Temperature range:', processedData.temperatureRange);
      console.log('Humidity range:', processedData.humidityRange);

      setData(processedData);
    } catch (error) {
      console.error('Error loading time series data:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
      setProgress(100);
    }
  }, [files, processFileData]);

  // Автоматическая загрузка при изменении файлов
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Мемоизированные данные для графиков
  const chartData = useMemo(() => {
    if (!data) return null;

    return {
      temperature: data.points.filter(p => p.temperature !== undefined),
      humidity: data.points.filter(p => p.humidity !== undefined)
    };
  }, [data]);

  return {
    data,
    chartData,
    loading,
    progress,
    error,
    reload: loadData
  };
};