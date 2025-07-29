// Web Worker для многопоточной загрузки данных
import { databaseService } from '../utils/database';

interface WorkerMessage {
  type: 'LOAD_FILE_DATA';
  payload: {
    fileId: string;
    fileName: string;
    maxPoints: number;
  };
}

interface WorkerResponse {
  type: 'FILE_DATA_LOADED' | 'ERROR';
  payload: any;
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;

  try {
    if (type === 'LOAD_FILE_DATA') {
      const { fileId, fileName, maxPoints } = payload;
      
      console.log(`Worker: Загружаем данные для файла ${fileName}`);
      
      // Загружаем измерения
      const measurements = await databaseService.getMeasurements(fileId);
      
      console.log(`Worker: Получено измерений для файла ${fileName}:`, measurements?.length || 0);
      
      if (!measurements || measurements.length === 0) {
        console.error(`Worker: Нет данных для файла ${fileName}`);
        self.postMessage({
          type: 'ERROR',
          payload: { fileId, error: 'Нет данных для файла' }
        } as WorkerResponse);
        return;
      }

      // Оптимизируем данные
      const step = Math.max(1, Math.floor(measurements.length / maxPoints));
      console.log(`Worker: Шаг оптимизации для файла ${fileName}:`, step);
      
      const optimizedData = measurements
        .filter((_, index) => index % step === 0)
        .map(m => ({
          timestamp: m.timestamp.getTime(),
          temperature: m.temperature,
          humidity: m.humidity,
          fileId,
          fileName,
          formattedTime: m.timestamp.toLocaleString('ru-RU')
        }));

      console.log(`Worker: Обработано ${optimizedData.length} точек для файла ${fileName} из ${measurements.length} исходных`);
      console.log(`Worker: Первая запись:`, optimizedData[0]);
      console.log(`Worker: Последняя запись:`, optimizedData[optimizedData.length - 1]);

      // Отправляем результат
      self.postMessage({
        type: 'FILE_DATA_LOADED',
        payload: {
          fileId,
          fileName,
          data: optimizedData,
          originalCount: measurements.length,
          optimizedCount: optimizedData.length
        }
      } as WorkerResponse);

    }
  } catch (error) {
    console.error('Worker error:', error);
    self.postMessage({
      type: 'ERROR',
      payload: { 
        fileId: payload.fileId, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      }
    } as WorkerResponse);
  }
};