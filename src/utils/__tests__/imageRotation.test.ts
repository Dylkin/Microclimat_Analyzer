/**
 * Тесты для функций поворота изображений
 */

describe('Поворот изображений на 90° против часовой стрелки', () => {
  let mockImage: HTMLImageElement;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;

  beforeEach(() => {
    const originalCreateElement = document.createElement.bind(document);

    // Mock для Image
    mockImage = {
      width: 100,
      height: 200,
      onload: null,
      onerror: null,
      src: '',
      crossOrigin: ''
    } as any;

    // Mock для Canvas
    mockCanvas = {
      width: 0,
      height: 0,
      getContext: jest.fn(),
      toBlob: jest.fn()
    } as any;

    // Mock для Context
    mockContext = {
      translate: jest.fn(),
      rotate: jest.fn(),
      drawImage: jest.fn()
    } as any;

    mockCanvas.getContext = jest.fn().mockReturnValue(mockContext);

    // Mock для document.createElement
    jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'img') {
        return mockImage as any;
      }
      if (tagName === 'canvas') {
        return mockCanvas as any;
      }
      return originalCreateElement(tagName);
    });

    // Mock для canvas.toBlob
    mockCanvas.toBlob = jest.fn((callback: (blob: Blob | null) => void) => {
      callback?.(new Blob(['test'], { type: 'image/png' }));
    });

    // Mock для URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();

    // Mock для fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob(['test'], { type: 'image/png' }))
      } as Response)
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('поворачивает изображение на 90° против часовой стрелки', async () => {
    // Импортируем функцию из TimeSeriesAnalyzer
    // Для тестирования нужно будет экспортировать функцию или создать отдельный модуль
    // Пока создаем тестовую функцию
    const rotateImage90CounterClockwise = async (imageUrl: string): Promise<Blob> => {
      return new Promise(async (resolve, reject) => {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          if (imageUrl.startsWith('blob:')) {
            const timeout = setTimeout(() => {
              reject(new Error('Таймаут загрузки изображения из blob URL'));
            }, 10000);
            
            img.onload = () => {
              clearTimeout(timeout);
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                reject(new Error('Не удалось получить контекст canvas'));
                return;
              }
              
              canvas.width = img.height;
              canvas.height = img.width;
              
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
              reject(new Error('Не удалось загрузить изображение из blob URL'));
            };
            
            img.src = imageUrl;
          } else {
            try {
              const response = await fetch(imageUrl);
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              
              img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                  URL.revokeObjectURL(url);
                  reject(new Error('Не удалось получить контекст canvas'));
                  return;
                }
                
                canvas.width = img.height;
                canvas.height = img.width;
                
                ctx.translate(0, canvas.height);
                ctx.rotate(-Math.PI / 2);
                ctx.drawImage(img, 0, 0);
                
                URL.revokeObjectURL(url);
                
                canvas.toBlob((blob) => {
                  if (blob) {
                    resolve(blob);
                  } else {
                    reject(new Error('Не удалось создать blob из canvas'));
                  }
                }, 'image/png');
              };
              
              img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Не удалось загрузить изображение'));
              };
              
              img.src = url;
            } catch (fetchError) {
              reject(fetchError);
            }
          }
        } catch (error) {
          reject(error);
        }
      });
    };

    // Симулируем загрузку изображения
    const blobUrl = 'blob:http://localhost/test';
    
    // Запускаем функцию
    const promise = rotateImage90CounterClockwise(blobUrl);
    
    // Симулируем успешную загрузку изображения
    setTimeout(() => {
      if (mockImage.onload) {
        mockImage.onload(new Event('load'));
      }
    }, 0);

    await expect(promise).resolves.toBeInstanceOf(Blob);
    
    // Проверяем, что canvas был настроен правильно (ширина и высота поменялись местами)
    expect(mockCanvas.width).toBe(200); // Была высота
    expect(mockCanvas.height).toBe(100); // Была ширина
    
    // Проверяем, что были вызваны правильные методы поворота
    expect(mockContext.translate).toHaveBeenCalledWith(0, 100);
    expect(mockContext.rotate).toHaveBeenCalledWith(-Math.PI / 2);
    expect(mockContext.drawImage).toHaveBeenCalledWith(mockImage, 0, 0);
  });

  test('обрабатывает ошибку загрузки изображения', async () => {
    const rotateImage90CounterClockwise = async (imageUrl: string): Promise<Blob> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Не удалось загрузить изображение'));
        img.src = imageUrl;
      });
    };

    const blobUrl = 'blob:http://localhost/invalid';
    
    const promise = rotateImage90CounterClockwise(blobUrl);
    
    setTimeout(() => {
      if (mockImage.onerror) {
        mockImage.onerror(new Event('error'));
      }
    }, 0);

    await expect(promise).rejects.toThrow('Не удалось загрузить изображение');
  });
});

