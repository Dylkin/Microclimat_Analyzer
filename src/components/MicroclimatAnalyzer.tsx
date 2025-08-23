import React from 'react';
import { BarChart3, Thermometer, Droplets, Wind, Sun, Upload, Trash2, Clock, CheckCircle, XCircle, Loader, ChevronUp, ChevronDown, BarChart, FolderOpen } from 'lucide-react';
import { UploadedFile } from '../types/FileData';
import { Contractor } from '../types/Contractor';
import { QualificationObject } from '../types/QualificationObject';
import { ProjectStatusLabels, ProjectStatus } from '../types/Project';
import { contractorService } from '../utils/contractorService';
import { qualificationObjectService } from '../utils/qualificationObjectService';
import { databaseService } from '../utils/database';
import { VI2ParsingService } from '../utils/vi2Parser';
import { TimeSeriesAnalyzer } from './TimeSeriesAnalyzer';

interface MicroclimatAnalyzerProps {
  showVisualization?: boolean;
  onShowVisualization?: (show: boolean) => void;
  selectedProject?: {
    id: string;
    name: string;
    contractorId: string;
    contractorName: string;
    qualificationObjects: Array<{
      qualificationObjectId: string;
      qualificationObjectName: string;
    }>;
    status: string;
  } | null;
}

export const MicroclimatAnalyzer: React.FC<MicroclimatAnalyzerProps> = ({ 
  showVisualization = false, 
  onShowVisualization,
  selectedProject
}) => {
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([]);
  const [contractors, setContractors] = React.useState<Contractor[]>([]);
  const [qualificationObjects, setQualificationObjects] = React.useState<QualificationObject[]>([]);
  const [selectedContractor, setSelectedContractor] = React.useState<string>('');
  const [selectedQualificationObject, setSelectedQualificationObject] = React.useState<string>('');
  const [contractorSearch, setContractorSearch] = React.useState('');
  const [qualificationSearch, setQualificationSearch] = React.useState('');
  const [showContractorDropdown, setShowContractorDropdown] = React.useState(false);
  const [showQualificationDropdown, setShowQualificationDropdown] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [editingField, setEditingField] = React.useState<{ fileId: string; field: 'zoneNumber' | 'measurementLevel' } | null>(null);

  const mockData = [
    { label: 'Температура', value: '22.5°C', icon: Thermometer, color: 'text-red-600', bg: 'bg-red-100' },
    { label: 'Влажность', value: '65%', icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Скорость ветра', value: '3.2 м/с', icon: Wind, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Освещенность', value: '850 лк', icon: Sun, color: 'text-yellow-600', bg: 'bg-yellow-100' }
  ];

  // Загрузка контрагентов при инициализации
  React.useEffect(() => {
    const loadContractors = async () => {
      if (!contractorService.isAvailable()) return;
      
      try {
        const data = await contractorService.getAllContractors();
        setContractors(data);
        
        // Если есть выбранный проект, устанавливаем контрагента
        if (selectedProject) {
          setSelectedContractor(selectedProject.contractorId);
        }
      } catch (error) {
        console.error('Ошибка загрузки контрагентов:', error);
      }
    };

    loadContractors();
  }, [selectedProject]);

  // Загрузка объектов квалификации при выборе контрагента
  React.useEffect(() => {
    const loadQualificationObjects = async () => {
      if (!selectedContractor || !qualificationObjectService.isAvailable()) {
        setQualificationObjects([]);
        setSelectedQualificationObject('');
        return;
      }
      
      try {
        const data = await qualificationObjectService.getQualificationObjects(selectedContractor);
        
        // Если есть выбранный проект, фильтруем объекты квалификации
        if (selectedProject) {
          const projectObjectIds = selectedProject.qualificationObjects.map(obj => obj.qualificationObjectId);
          const filteredData = data.filter(obj => projectObjectIds.includes(obj.id));
          setQualificationObjects(filteredData);
        } else {
          setQualificationObjects(data);
        }
        
        setSelectedQualificationObject(''); // Сбрасываем выбор объекта при смене контрагента
      } catch (error) {
        console.error('Ошибка загрузки объектов квалификации:', error);
        setQualificationObjects([]);
      }
    };

    loadQualificationObjects();
  }, [selectedContractor, selectedProject]);

  // Фильтрация контрагентов по поиску
  const filteredContractors = React.useMemo(() => {
    if (!contractorSearch.trim()) return contractors;
    
    return contractors.filter(contractor =>
      contractor.name.toLowerCase().includes(contractorSearch.toLowerCase()) ||
      (contractor.address && contractor.address.toLowerCase().includes(contractorSearch.toLowerCase()))
    );
  }, [contractors, contractorSearch]);

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

  // Получение названия контрагента по ID
  const getContractorName = (contractorId: string) => {
    const contractor = contractors.find(c => c.id === contractorId);
    return contractor ? contractor.name : 'Выберите контрагента';
  };

  // Получение названия объекта квалификации по ID
  const getQualificationObjectName = (objectId: string) => {
    const obj = qualificationObjects.find(o => o.id === objectId);
    if (!obj) return 'Выберите объект квалификации';
    
    return obj.name || obj.vin || obj.serialNumber || `${obj.type} (без названия)`;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    
    // Создаем записи для файлов с начальным статусом
    const newFiles: UploadedFile[] = fileArray.map((file, index) => {
      // Проверяем расширение файла
      if (!file.name.toLowerCase().endsWith('.vi2')) {
        alert(`Файл "${file.name}" имеет неподдерживаемый формат. Поддерживаются только файлы .vi2`);
        return null;
      }

      return {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: file.name,
        uploadDate: new Date().toLocaleString('ru-RU'),
        parsingStatus: 'processing' as const,
        order: uploadedFiles.length + index,
        contractorId: selectedContractor || undefined,
        qualificationObjectId: selectedQualificationObject || undefined,
        qualificationObjectName: selectedQualificationObject ? getQualificationObjectName(selectedQualificationObject) : undefined,
        contractorName: selectedContractor ? getContractorName(selectedContractor) : undefined
      };
    }).filter(Boolean) as UploadedFile[];

    // Добавляем файлы в состояние
    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Парсим файлы
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const fileRecord = newFiles[i];
      
      if (!fileRecord) continue;
      
      try {
        // Реальный парсинг файла
        console.log(`Парсинг файла: ${file.name}`);
        
        // Читаем файл как ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        
        // Используем универсальный парсер VI2
        const parsingService = new VI2ParsingService();
        const parsedData = await parsingService.parseFile(file);
        
        // Сохраняем в базу данных
        await databaseService.saveParsedFileData(parsedData, fileRecord.id);
        
        setUploadedFiles(prev => prev.map(f => {
          if (f.id === fileRecord.id) {
            const period = `${parsedData.startDate.toLocaleDateString('ru-RU')} - ${parsedData.endDate.toLocaleDateString('ru-RU')}`;
            return {
              ...f,
              parsingStatus: 'completed' as const, 
              parsedData,
              recordCount: parsedData.recordCount,
              period
            };
          }
          return f;
        }));
        
      } catch (error) {
        console.error('Ошибка парсинга файла:', error);
        
        // Обновляем статус на ошибку
        setUploadedFiles(prev => prev.map(f => {
          if (f.id === fileRecord.id) {
            return {
              ...f,
              parsingStatus: 'error' as const,
              errorMessage: error instanceof Error ? error.message : 'Неизвестная ошибка'
            };
          }
          return f;
        }));
      }
    }

    // Очищаем input для возможности загрузки того же файла повторно
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (confirm('Вы уверены, что хотите удалить этот файл?')) {
      try {
        // Удаляем данные из базы
        await databaseService.deleteFileData(fileId);
      } catch (error) {
        console.error('Ошибка удаления данных из базы:', error);
      }
      
      // Удаляем из состояния
      setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const moveFile = (fileId: string, direction: 'up' | 'down') => {
    setUploadedFiles(prev => {
      const sortedFiles = [...prev].sort((a, b) => a.order - b.order);
      const currentIndex = sortedFiles.findIndex(f => f.id === fileId);
      
      if (currentIndex === -1) return prev;
      if (direction === 'up' && currentIndex === 0) return prev;
      if (direction === 'down' && currentIndex === sortedFiles.length - 1) return prev;
      
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      // Меняем местами order
      const currentFile = sortedFiles[currentIndex];
      const targetFile = sortedFiles[newIndex];
      
      return prev.map(f => {
        if (f.id === currentFile.id) return { ...f, order: targetFile.order };
        if (f.id === targetFile.id) return { ...f, order: currentFile.order };
        return f;
      });
    });
  };

  const updateFileField = (fileId: string, field: 'zoneNumber' | 'measurementLevel', value: string | number) => {
    setUploadedFiles(prev => prev.map(f => {
      if (f.id === fileId) {
        return { ...f, [field]: value };
      }
      return f;
    }));
  };

  const handleExploreData = () => {
    const completedFiles = uploadedFiles.filter(f => f.parsingStatus === 'completed');
    if (completedFiles.length === 0) {
      alert('Нет обработанных файлов для исследования');
      return;
    }
    
    // Переходим напрямую к анализатору временных рядов
    if (onShowVisualization) {
      onShowVisualization(true);
    }
  };

  // Если показываем визуализацию, рендерим компонент визуализации
  if (showVisualization) {
    return (
      <TimeSeriesAnalyzer 
        files={uploadedFiles.filter(f => f.parsingStatus === 'completed')}
        onBack={() => onShowVisualization?.(false)}
      />
    );
  }

  const getStatusIcon = (status: UploadedFile['parsingStatus']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-500" />;
      case 'processing':
        return <Loader className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: UploadedFile['parsingStatus']) => {
    switch (status) {
      case 'pending':
        return 'Загрузка';
      case 'processing':
        return 'Обработка';
      case 'completed':
        return 'Обработан';
      case 'error':
        return 'Ошибка обработки';
      default:
        return 'Неизвестно';
    }
  };

  // Сортируем файлы по порядку для отображения
  const sortedFiles = [...uploadedFiles].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <BarChart3 className="w-8 h-8 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Microclimat Analyzer</h1>
      </div>

      {/* Секция загрузки файлов */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Загрузка файлов</h2>
          <div className="flex space-x-3">
            <button
              onClick={handleExploreData}
              disabled={uploadedFiles.filter(f => f.parsingStatus === 'completed').length === 0}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <BarChart className="w-4 h-4" />
              <span>Исследовать данные</span>
            </button>
            <button
              onClick={triggerFileUpload}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>Загрузить файлы в формате Vi2</span>
            </button>
          </div>
        </div>

        {/* Селекторы контрагента и объекта квалификации */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Селектор контрагента */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Контрагент {selectedProject && <span className="text-blue-600">(из проекта)</span>}
            </label>
            <div className="relative">
              <input
                type="text"
                value={selectedContractor ? getContractorName(selectedContractor) : contractorSearch}
                onChange={(e) => {
                  if (selectedProject) return; // Блокируем изменения если выбран проект
                  setContractorSearch(e.target.value);
                  if (!selectedContractor) {
                    setShowContractorDropdown(true);
                  }
                }}
                onFocus={() => {
                  if (selectedProject) return; // Блокируем изменения если выбран проект
                  setShowContractorDropdown(true);
                  if (selectedContractor) {
                    setContractorSearch('');
                    setSelectedContractor('');
                  }
                }}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  selectedProject ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                placeholder="Поиск контрагента..."
                disabled={!!selectedProject}
              />
              
              {showContractorDropdown && !selectedProject && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredContractors.length > 0 ? (
                    filteredContractors.map((contractor) => (
                      <div
                        key={contractor.id}
                        onClick={() => {
                          setSelectedContractor(contractor.id);
                          setContractorSearch('');
                          setShowContractorDropdown(false);
                        }}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">{contractor.name}</div>
                        {contractor.address && (
                          <div className="text-sm text-gray-500">{contractor.address}</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-gray-500 text-sm">
                      Контрагенты не найдены
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Селектор объекта квалификации */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Объект квалификации {selectedProject && <span className="text-blue-600">(из проекта)</span>}
            </label>
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
                  if (selectedContractor) {
                    setShowQualificationDropdown(true);
                    if (selectedQualificationObject) {
                      setQualificationSearch('');
                      setSelectedQualificationObject('');
                    }
                  }
                }}
                disabled={!selectedContractor}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder={selectedContractor ? 
                  (selectedProject ? "Объекты квалификации из проекта" : "Поиск объекта квалификации...") : 
                  "Сначала выберите контрагента"
                }
              />
              
              {showQualificationDropdown && selectedContractor && (
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
                          {obj.type} {obj.address && `• ${obj.address}`}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-gray-500 text-sm">
                      {selectedProject ? 
                        "В проекте нет объектов квалификации" : 
                        "Объекты квалификации не найдены"
                      }
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".vi2"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />

        {uploadedFiles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                    Порядок
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Имя файла
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Период данных
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Количество записей
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    № зоны измерения
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Уровень измерения (м.)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Удалить
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedFiles.map((file, index) => (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <button
                          onClick={() => moveFile(file.id, 'up')}
                          disabled={index === 0}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveFile(file.id, 'down')}
                          disabled={index === sortedFiles.length - 1}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{file.name}</div>
                        <div className="text-xs text-gray-500">{file.uploadDate}</div>
                        {file.parsedData && (
                          <div className="text-xs text-gray-500 mt-1">
                            {file.parsedData.deviceMetadata.deviceModel} (S/N: {file.parsedData.deviceMetadata.serialNumber})
                          </div>
                        )}
                        {file.contractorId && (
                          <div className="text-xs text-blue-600 mt-1">
                            📋 {getContractorName(file.contractorId)}
                          </div>
                        )}
                        {file.qualificationObjectId && (
                          <div className="text-xs text-green-600 mt-1">
                            🏢 {getQualificationObjectName(file.qualificationObjectId)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {file.period || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {file.recordCount ? file.recordCount.toLocaleString('ru-RU') : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingField?.fileId === file.id && editingField?.field === 'zoneNumber' ? (
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={file.zoneNumber || ''}
                          onChange={(e) => updateFileField(file.id, 'zoneNumber', parseInt(e.target.value) || '')}
                          onBlur={() => setEditingField(null)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                          className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          autoFocus
                        />
                      ) : (
                        <div
                          onClick={() => setEditingField({ fileId: file.id, field: 'zoneNumber' })}
                          className="text-sm text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                        >
                          {file.zoneNumber || 'Нажмите для ввода'}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingField?.fileId === file.id && editingField?.field === 'measurementLevel' ? (
                        <input
                          type="text"
                          value={file.measurementLevel || ''}
                          onChange={(e) => updateFileField(file.id, 'measurementLevel', e.target.value)}
                          onBlur={() => setEditingField(null)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                          className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          autoFocus
                        />
                      ) : (
                        <div
                          onClick={() => setEditingField({ fileId: file.id, field: 'measurementLevel' })}
                          className="text-sm text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
                        >
                          {file.measurementLevel || 'Нажмите для ввода'}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(file.parsingStatus)}
                        <span className="text-sm text-gray-900">{getStatusText(file.parsingStatus)}</span>
                      </div>
                      {file.errorMessage && (
                        <div className="text-xs text-red-600 mt-1">{file.errorMessage}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="Удалить файл"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Файлы не загружены</p>
            <p className="text-sm">Нажмите кнопку "Загрузить файлы" для добавления файлов в формате .vi2</p>
          </div>
        )}
      </div>

      {/* Информация о проекте */}
      {selectedProject && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <FolderOpen className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-medium text-blue-900">Работа в рамках проекта</h3>
          </div>
          <div className="text-sm text-blue-800">
            <div><strong>Проект:</strong> {selectedProject.name}</div>
            <div><strong>Контрагент:</strong> {selectedProject.contractorName}</div>
            <div><strong>Статус:</strong> {ProjectStatusLabels[selectedProject.status as ProjectStatus]}</div>
            <div><strong>Объектов квалификации:</strong> {selectedProject.qualificationObjects.length}</div>
          </div>
        </div>
      )}

      {/* Примечание о внешнем датчике */}
      {uploadedFiles.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm font-medium">
            <strong>Примечание:</strong> Для внешнего датчика указать № зоны измерения 999.
          </p>
        </div>
      )}

    </div>
  );
};