import { useState, useCallback, useRef } from 'react';
import { UploadedFile } from '../types/FileData';

interface ChartData {
  timestamp: number;
  temperature: number;
  humidity?: number;
  fileId: string;
  fileName: string;
  formattedTime: string;
  uniqueKey?: string;
}

interface LoadingProgress {
  total: number;
  completed: number;
  currentFile: string;
}

export const useMultiThreadDataLoader = () => {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress>({ total: 0, completed: 0, currentFile: '' });
  const workersRef = useRef<Worker[]>([]);
  const loadedDataRef = useRef<Map<string, ChartData[]>>(new Map());

  const loadData = useCallback(async (files: UploadedFile[]) => {
    const completedFiles = files.filter(f => f.parsingStatus === 'completed');
    
    console.log('useMultiThreadDataLoader: Начинаем загрузку данных');
    console.log('useMultiThreadDataLoader: Всего файлов:', files.length);
    console.log('useMultiThreadDataLoader: Обработанных файлов:', completedFiles.length);
    
    if (completedFiles.length === 0) {
      console.log('Нет файлов для загрузки');
      setChartData([]);
      return;
    }

    setIsLoading(true);
    setLoadingProgress({ total: completedFiles.length, completed: 0, currentFile: '' });
    setChartData([]);
    loadedDataRef.current.clear();

    console.log(`useMultiThreadDataLoader: Начинаем многопоточную загрузку ${completedFiles.length} файлов`);

    // Определяем количество воркеров (максимум 4 или количество файлов)
    const workerCount = Math.min(4, completedFiles.length);
    const maxPointsPerFile = Math.floor(10000 / completedFiles.length); // Распределяем точки между файлами

    console.log('useMultiThreadDataLoader: Количество воркеров:', workerCount);
    console.log('useMultiThreadDataLoader: Максимум точек на файл:', maxPointsPerFile);

    try {
      // Создаем воркеры
      const workers: Worker[] = [];
      for (let i = 0; i < workerCount; i++) {
        const worker = new Worker(
          new URL('../workers/dataLoader.worker.ts', import.meta.url),
          { type: 'module' }
        );
        workers.push(worker);
      }
      workersRef.current = workers;

      // Создаем промисы для каждого файла
      const filePromises = completedFiles.map((file, index) => {
        return new Promise<void>((resolve, reject) => {
          const workerIndex = index % workerCount;
          const worker = workers[workerIndex];

          const handleMessage = (event: MessageEvent) => {
            const { type, payload } = event.data;

            if (payload.fileId === file.id) {
              worker.removeEventListener('message', handleMessage);

              if (type === 'FILE_DATA_LOADED') {
                console.log(`useMultiThreadDataLoader: Получены данные для файла ${payload.fileName}: ${payload.optimizedCount} точек`);
                
                // Сохраняем данные
                loadedDataRef.current.set(file.id, payload.data);
                
                console.log('useMultiThreadDataLoader: Всего загружено файлов:', loadedDataRef.current.size);
                
                // Обновляем прогресс
                setLoadingProgress(prev => ({
                  ...prev,
                  completed: prev.completed + 1,
                  currentFile: payload.fileName
                }));

                // Обновляем график с накопленными данными
                const allData: ChartData[] = [];
                loadedDataRef.current.forEach(fileData => {
                  allData.push(...fileData);
                });
                
                // Сортируем по времени
                allData.sort((a, b) => a.timestamp - b.timestamp);
                
                console.log('useMultiThreadDataLoader: Обновляем chartData, всего записей:', allData.length);
                setChartData([...allData]);

                resolve();
              } else if (type === 'ERROR') {
                console.error(`useMultiThreadDataLoader: Ошибка загрузки файла ${file.name}:`, payload.error);
                setLoadingProgress(prev => ({
                  ...prev,
                  completed: prev.completed + 1
                }));
                resolve(); // Продолжаем даже при ошибке
              }
            }
          };

          worker.addEventListener('message', handleMessage);

          // Отправляем задачу воркеру
          worker.postMessage({
            type: 'LOAD_FILE_DATA',
            payload: {
              fileId: file.id,
              fileName: file.name,
              maxPoints: Math.max(1000, maxPointsPerFile) // Минимум 1000 точек на файл
            }
          });
        });
      });

      // Ждем завершения всех задач
      await Promise.all(filePromises);

      console.log(`useMultiThreadDataLoader: Многопоточная загрузка завершена`);
      
      // Финальная проверка данных
      const finalData: ChartData[] = [];
      loadedDataRef.current.forEach(fileData => {
        finalData.push(...fileData);
      });
      finalData.sort((a, b) => a.timestamp - b.timestamp);
      
      console.log(`useMultiThreadDataLoader: Финальная установка данных, всего точек: ${finalData.length}`);
      setChartData([...finalData]);

    } catch (error) {
      console.error('useMultiThreadDataLoader: Ошибка многопоточной загрузки:', error);
    } finally {
      // Очищаем воркеры
      workersRef.current.forEach(worker => worker.terminate());
      workersRef.current = [];
      
      setIsLoading(false);
      setLoadingProgress({ total: 0, completed: 0, currentFile: '' });
    }
  }, []);

  const cleanup = useCallback(() => {
    // Завершаем все воркеры при размонтировании
    workersRef.current.forEach(worker => worker.terminate());
    workersRef.current = [];
    loadedDataRef.current.clear();
  }, []);

  return {
    chartData,
    isLoading,
    loadingProgress,
    loadData,
    cleanup
  };
};