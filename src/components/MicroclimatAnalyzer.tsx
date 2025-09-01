import React from 'react';
import { BarChart3, Thermometer, Droplets, Wind, Sun, Upload, Trash2, Clock, CheckCircle, XCircle, Loader, ChevronUp, ChevronDown, BarChart, FolderOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UploadedFile } from '../types/FileData';
import { Contractor } from '../types/Contractor';
import { QualificationObject } from '../types/QualificationObject';
import { Equipment } from '../types/Equipment';
import { EquipmentAssignment } from '../utils/equipmentAssignmentService';
import { ProjectStatusLabels, ProjectStatus } from '../types/Project';
import { contractorService } from '../utils/contractorService';
import { qualificationObjectService } from '../utils/qualificationObjectService';
import { equipmentService } from '../utils/equipmentService';
import { equipmentAssignmentService } from '../utils/equipmentAssignmentService';
import { databaseService } from '../utils/database';
import { uploadedFileService } from '../utils/uploadedFileService';
import { VI2ParsingService } from '../utils/vi2Parser';
import { TimeSeriesAnalyzer } from './TimeSeriesAnalyzer';
import { createClient } from '@supabase/supabase-js';

// Инициализация Supabase клиента для получения пользователя
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: any = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
}

// Функция для получения ID пользователя из Supabase Auth
async function getUserIdOrThrow(): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase не настроен');
  }
  
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    throw new Error('Пользователь не авторизован');
  }
  
  return data.user.id; // UUID
}

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
  selectedQualificationObjectId?: string;
}

export const MicroclimatAnalyzer: React.FC<MicroclimatAnalyzerProps> = ({ 
  showVisualization = false, 
  onShowVisualization,
  selectedProject,
  selectedQualificationObjectId
}) => {
  const { user } = useAuth();
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([]);
  const [contractors, setContractors] = React.useState<Contractor[]>([]);
  const [qualificationObjects, setQualificationObjects] = React.useState<QualificationObject[]>([]);
  const [equipment, setEquipment] = React.useState<Equipment[]>([]);
  const [equipmentAssignments, setEquipmentAssignments] = React.useState<EquipmentAssignment[]>([]);
  const [selectedContractor, setSelectedContractor] = React.useState<string>('');
  const [selectedQualificationObject, setSelectedQualificationObject] = React.useState<string>('');
  const [contractorSearch, setContractorSearch] = React.useState('');
  const [qualificationSearch, setQualificationSearch] = React.useState('');
  const [showContractorDropdown, setShowContractorDropdown] = React.useState(false);
  const [showQualificationDropdown, setShowQualificationDropdown] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [editingField, setEditingField] = React.useState<{ fileId: string; field: 'zoneNumber' | 'measurementLevel' } | null>(null);
  const [saveStatus, setSaveStatus] = React.useState<{
    isSaving: boolean;
    lastSaved: Date | null;
    error: string | null;
  }>({
    isSaving: false,
    lastSaved: null,
    error: null
  });
  const [projectFilesLoaded, setProjectFilesLoaded] = React.useState(false);

  // Обработчик загрузки файла для конкретной строки
  const handleFileUploadForRow = async (fileId: string, uploadedFile: File) => {
    // Проверяем расширение файла
    if (!uploadedFile.name.toLowerCase().endsWith('.vi2')) {
      alert(`Файл "${uploadedFile.name}" имеет неподдерживаемый формат. Поддерживаются только файлы .vi2`);
      return;
    }

    // Обновляем статус файла на "обработка"
    setUploadedFiles(prev => prev.map(f => 
      f.id === fileId ? { 
        ...f, 
        parsingStatus: 'processing' as const,
        actualFileName: uploadedFile.name,
        uploadDate: new Date().toLocaleString('ru-RU')
      } : f
    ));

    try {
      // Реальный парсинг файла
      console.log(`Парсинг файла для строки: ${uploadedFile.name}`);
      
      // Читаем файл как ArrayBuffer
      const arrayBuffer = await uploadedFile.arrayBuffer();
      
      // Используем универсальный парсер VI2
      const parsingService = new VI2ParsingService();
      const parsedData = await parsingService.parseFile(uploadedFile);
      
      // Сохраняем в базу данных
      await databaseService.saveParsedFileData(parsedData, fileId);
      
      setUploadedFiles(prev => prev.map(f => {
        if (f.id === fileId) {
          const period = `${parsedData.startDate.toLocaleDateString('ru-RU')} - ${parsedData.endDate.toLocaleDateString('ru-RU')}`;
          return {
            ...f,
            parsingStatus: 'completed' as const, 
            parsedData,
            recordCount: parsedData.recordCount,
            period,
            actualFileName: uploadedFile.name
          };
        }
        return f;
      }));
      
    } catch (error) {
      console.error('Ошибка парсинга файла:', error);
      
      // Обновляем статус на ошибку
      setUploadedFiles(prev => prev.map(f => {
        if (f.id === fileId) {
          return {
            ...f,
            parsingStatus: 'error' as const,
            errorMessage: error instanceof Error ? error.message : 'Неизвестная ошибка',
            actualFileName: uploadedFile.name
          };
        }
        return f;
      }));
    }
  };

  const mockData = [
    { label: 'Температура', value: '22.5°C', icon: Thermometer, color: 'text-red-600', bg: 'bg-red-100' },
    { label: 'Влажность', value: '65%', icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Скорость ветра', value: '3.2 м/с', icon: Wind, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Освещенность', value: '850 лк', icon: Sun, color: 'text-yellow-600', bg: 'bg-yellow-100' }
  ];

  // Загрузка контрагентов при инициализации
  React.useEffect(() => {
    const loadInitialData = async () => {
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
      
      // Загружаем оборудование
      if (equipmentService.isAvailable()) {
        try {
          const equipmentResult = await equipmentService.getAllEquipment(1, 1000); // Загружаем все оборудование
          setEquipment(equipmentResult.data);
        } catch (error) {
          console.error('Ошибка загрузки оборудования:', error);
        }
      }
    };

    loadInitialData();
  }, [selectedProject]);

  // Загрузка назначений оборудования при выборе объекта квалификации
  React.useEffect(() => {
    const loadEquipmentAssignments = async () => {
      if (!selectedQualificationObject || !equipmentAssignmentService.isAvailable()) {
        setEquipmentAssignments([]);
        setUploadedFiles([]);
        return;
      }

      try {
        console.log('Загружаем назначения оборудования для объекта:', selectedQualificationObject);
        
        let placement;
        if (selectedProject) {
          // Если есть проект, загружаем размещение для проекта
          placement = await equipmentAssignmentService.getEquipmentPlacement(
            selectedProject.id, 
            selectedQualificationObject
          );
        } else {
          // Если нет проекта, создаем пустое размещение
          placement = { zones: [] };
        }
        
        // Преобразуем размещение в список назначений
        const assignments: EquipmentAssignment[] = [];
        placement.zones.forEach(zone => {
          zone.levels.forEach(level => {
            if (level.equipmentId) {
              const equipmentItem = equipment.find(eq => eq.id === level.equipmentId);
              assignments.push({
                id: `${zone.zoneNumber}-${level.levelValue}`,
                projectId: selectedProject?.id || '',
                qualificationObjectId: selectedQualificationObject,
                equipmentId: level.equipmentId,
                equipmentName: level.equipmentName || equipmentItem?.name,
                zoneNumber: zone.zoneNumber,
                measurementLevel: level.levelValue,
                assignedAt: new Date(),
                createdAt: new Date()
              });
            }
          });
        });
        
        setEquipmentAssignments(assignments);
        console.log('Загружено назначений оборудования:', assignments.length);
        
        // Загружаем ранее сохраненные файлы для этого объекта квалификации
        let savedFiles: UploadedFile[] = [];
        if (selectedProject && uploadedFileService.isAvailable()) {
          try {
            const userId = await getUserIdOrThrow();
            const projectFiles = await uploadedFileService.getProjectFiles(selectedProject.id, userId);
            // Фильтруем файлы для выбранного объекта квалификации
            savedFiles = projectFiles.filter(file => 
              file.qualificationObjectId === selectedQualificationObject
            );
            console.log('Загружено сохраненных файлов для объекта:', savedFiles.length);
          } catch (error) {
            console.error('Ошибка загрузки сохраненных файлов:', error);
          }
        }
        
        // Создаем строки в таблице для каждого назначения оборудования
        const newFiles: UploadedFile[] = assignments.map((assignment, index) => {
          // Ищем сохраненный файл для этого назначения
          const savedFile = savedFiles.find(file => 
            file.zoneNumber === assignment.zoneNumber && 
            file.measurementLevel === assignment.measurementLevel.toString()
          );
          
          if (savedFile) {
            // Если есть сохраненный файл, используем его данные
            return {
              ...savedFile,
              order: index,
              contractorId: selectedContractor || undefined,
              qualificationObjectId: selectedQualificationObject,
              qualificationObjectName: getQualificationObjectName(selectedQualificationObject),
              contractorName: selectedContractor ? getContractorName(selectedContractor) : undefined
            };
          } else {
            // Если нет сохраненного файла, создаем новую строку
            return {
              id: crypto.randomUUID(),
              name: `${assignment.equipmentName || 'Unknown'}_zone${assignment.zoneNumber}_level${assignment.measurementLevel}.vi2`,
              uploadDate: new Date().toLocaleString('ru-RU'),
              parsingStatus: 'pending' as const,
              order: index,
              zoneNumber: assignment.zoneNumber,
              measurementLevel: assignment.measurementLevel.toString(),
              contractorId: selectedContractor || undefined,
              qualificationObjectId: selectedQualificationObject,
              qualificationObjectName: getQualificationObjectName(selectedQualificationObject),
              contractorName: selectedContractor ? getContractorName(selectedContractor) : undefined
            };
          }
        });
    // Проверяем наличие qualificationObjects перед использованием find
    if (!selectedProject.qualificationObjects || !Array.isArray(selectedProject.qualificationObjects)) {
      console.warn('qualificationObjects отсутствует или не является массивом');
      return;
    }

        
        // Добавляем файлы, которые не связаны с назначениями оборудования (если есть)
        const filesWithoutAssignment = savedFiles.filter(file => 
          !assignments.some(assignment => 
            assignment.zoneNumber === file.zoneNumber && 
            assignment.measurementLevel.toString() === file.measurementLevel
          )
        );
        
        // Объединяем файлы из назначений и дополнительные файлы
        const allFiles = [...newFiles, ...filesWithoutAssignment.map((file, index) => ({
          ...file,
          order: newFiles.length + index,
          contractorId: selectedContractor || undefined,
          qualificationObjectId: selectedQualificationObject,
          qualificationObjectName: getQualificationObjectName(selectedQualificationObject),
          contractorName: selectedContractor ? getContractorName(selectedContractor) : undefined
        }))];
        
        // Заменяем текущие файлы на объединенные файлы
        setUploadedFiles(allFiles);
        console.log('Загружено строк в таблице:', allFiles.length, '(назначения:', newFiles.length, ', дополнительные:', filesWithoutAssignment.length, ')');
        
      } catch (error) {
        console.error('Ошибка загрузки назначений оборудования:', error);
        setEquipmentAssignments([]);
        setUploadedFiles([]);
      }
    };

    loadEquipmentAssignments();
  }, [selectedQualificationObject, selectedProject, equipment, selectedContractor]);

  // Загрузка ранее сохраненных файлов проекта
  React.useEffect(() => {
    const loadProjectFiles = async () => {
      if (!selectedProject || !uploadedFileService.isAvailable() || projectFilesLoaded) {
        return;
      }

      try {
        // Получаем userId из Supabase Auth
        const userId = await getUserIdOrThrow();
        
        console.log('Загружаем ранее сохраненные файлы проекта:', selectedProject.id);
        const projectFiles = await uploadedFileService.getProjectFiles(selectedProject.id, userId);
        
        if (projectFiles.length > 0) {
          console.log('Найдены ранее сохраненные файлы:', projectFiles.length);
          setUploadedFiles(projectFiles);
        }
        
        setProjectFilesLoaded(true);
      } catch (error) {
        console.error('Ошибка загрузки файлов проекта:', error);
        setProjectFilesLoaded(true);
      }
    };

    loadProjectFiles();
  }, [selectedProject, projectFilesLoaded]);

  // Загрузка объектов квалификации при выборе контрагента
  React.useEffect(() => {
    const loadQualificationObjects = async () => {
      if (!selectedContractor || !qualificationObjectService.isAvailable()) {
        setQualificationObjects([]);
        setSelectedQualificationObject('');
        return;
      }
      
      try {
        const data = await qualificationObjectService.getQualificationObjectsByContractor(selectedContractor);
        
        // Если есть выбранный проект, фильтруем объекты квалификации
        if (selectedProject) {
          const projectObjectIds = selectedProject.qualificationObjects.map(obj => obj.qualificationObjectId);
          const filteredData = data.filter(obj => projectObjectIds.includes(obj.id));
          setQualificationObjects(filteredData);
          
          // Если передан selectedQualificationObjectId, устанавливаем его
          if (selectedQualificationObjectId && projectObjectIds.includes(selectedQualificationObjectId)) {
            setSelectedQualificationObject(selectedQualificationObjectId);
          }
        } else {
          setQualificationObjects(data);
        }
        
        // Сбрасываем выбор объекта при смене контрагента только если не передан selectedQualificationObjectId
        if (!selectedQualificationObjectId) {
          setSelectedQualificationObject('');
        }
      } catch (error) {
        console.error('Ошибка загрузки объектов квалификации:', error);
        setQualificationObjects([]);
      }
    };

    loadQualificationObjects();
  }, [selectedContractor, selectedProject, selectedQualificationObjectId]);

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

  // Получение названия оборудования по серийному номеру
  const getEquipmentName = (serialNumber: string) => {
    const eq = equipment.find(e => e.serialNumber === serialNumber);
    return eq ? eq.name : serialNumber;
  };

  // Получение названия оборудования по ID
  const getEquipmentNameById = (equipmentId: string) => {
    const eq = equipment.find(e => e.id === equipmentId);
    return eq ? eq.name : 'Unknown';
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
        id: crypto.randomUUID(),
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
        
        // Удаляем из базы данных uploaded_files если файл был сохранен
        if (uploadedFileService.isAvailable()) {
          try {
            await uploadedFileService.deleteFile(fileId);
          } catch (error) {
            console.warn('Файл не найден в базе данных или уже удален:', error);
          }
        }
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

  const handleSaveProject = async () => {
    if (!selectedProject) {
      alert('Нет выбранного проекта для сохранения');
      return;
    }

    // Проверяем, есть ли файлы с загруженными данными
    const filesWithData = uploadedFiles.filter(f => f.actualFileName && f.parsingStatus === 'completed');
    if (filesWithData.length === 0) {
      alert('Нет обработанных файлов для сохранения');
      return;
    }

    if (!selectedQualificationObject) {
      alert('Выберите объект квалификации для сохранения файлов');
      return;
    }

    // Получаем тип объекта квалификации
    const qualificationObject = qualificationObjects.find(obj => obj.id === selectedQualificationObject);
    if (!qualificationObject) {
      alert('Выбранный объект квалификации не найден');
      return;
    }

    setSaveStatus(prev => ({ ...prev, isSaving: true, error: null }));

    try {
      // Получаем userId из Supabase Auth
      const userId = await getUserIdOrThrow();
      
      // Сохраняем только файлы с загруженными данными в базе данных с привязкой к проекту
      await uploadedFileService.saveProjectFiles({
        projectId: selectedProject.id,
        qualificationObjectId: selectedQualificationObject,
        objectType: qualificationObject.type,
        files: filesWithData
      }, userId);
      
      // Обновляем статус сохранения
      setSaveStatus({
        isSaving: false,
        lastSaved: new Date(),
        error: null
      });

      console.log('Сохранение данных проекта:', {
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        qualificationObjectId: selectedQualificationObject,
        objectType: qualificationObject.type,
        filesCount: filesWithData.length,
        completedFiles: filesWithData.length
      });

      alert(`Успешно сохранено ${filesWithData.length} файлов для проекта`);

    } catch (error) {
      console.error('Ошибка сохранения данных проекта:', error);
      
      // Показываем пользователю понятное сообщение
      let errorMessage = 'Неизвестная ошибка';
      if (error instanceof Error) {
        if (error.message.includes('не авторизован')) {
          errorMessage = 'Необходимо войти в систему для сохранения данных';
        } else if (error.message.includes('не настроен')) {
          errorMessage = 'Система не настроена. Обратитесь к администратору';
        } else {
          errorMessage = error.message;
        }
      }
      
      setSaveStatus({
        isSaving: false,
        lastSaved: null,
        error: errorMessage
      });
    }
  };

  const updateFileField = (fileId: string, field: 'zoneNumber' | 'measurementLevel', value: string | number) => {
    setUploadedFiles(prev => prev.map(f => {
      if (f.id === fileId) {
        const updatedFile = { ...f, [field]: value };
        
        // Обновляем в базе данных если файл был сохранен и Supabase доступен
        if (uploadedFileService.isAvailable()) {
          const updates: any = {};
          if (field === 'zoneNumber') updates.zoneNumber = value as number;
          if (field === 'measurementLevel') updates.measurementLevel = value as string;
          
          uploadedFileService.updateFileMetadata(fileId, updates).catch(error => {
            console.warn('Ошибка обновления метаданных файла в БД:', error);
          });
        }
        
        return updatedFile;
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

      {/* Селекторы контрагента и объекта квалификации */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Загрузка файлов</h2>
          <div className="flex space-x-3">
            {selectedProject && (
              <button
                onClick={handleSaveProject}
                disabled={saveStatus.isSaving || uploadedFiles.length === 0}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {saveStatus.isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Сохранение...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Сохранить</span>
                  </>
                )}
              </button>
            )}
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

        {/* Save Status */}
        {selectedProject && (
          <div className="mb-4">
            {!projectFilesLoaded && uploadedFiles.length === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-blue-800">
                    Загрузка ранее сохраненных файлов проекта...
                  </span>
                </div>
              </div>
            )}
            
            {saveStatus.lastSaved && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-800">
                    Последнее сохранение: {saveStatus.lastSaved.toLocaleString('ru-RU')}
                  </span>
                </div>
              </div>
            )}
            
            {saveStatus.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-800">
                    Ошибка сохранения: {saveStatus.error}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}


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
                    Оборудование
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    № зоны измерения
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Уровень измерения (м.)
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
                          disabled={index === sortedFiles.filter(f => f.actualFileName).length - 1}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {(() => {
                          // Сначала пытаемся найти оборудование по назначению
                          const assignment = equipmentAssignments.find(a => 
                            a.zoneNumber === file.zoneNumber && 
                            a.measurementLevel.toString() === file.measurementLevel
                          );
                          
                          if (assignment && assignment.equipmentName) {
                            return assignment.equipmentName;
                          }
                          
                          // Если не найдено по назначению, ищем по серийному номеру из файла
                          if (file.parsedData?.deviceMetadata?.serialNumber) {
                            return getEquipmentName(file.parsedData.deviceMetadata.serialNumber);
                          }
                          
                          return '-';
                        })()
                        }
                      </div>
                      {(() => {
                        const assignment = equipmentAssignments.find(a => 
                          a.zoneNumber === file.zoneNumber && 
                          a.measurementLevel.toString() === file.measurementLevel
                        );
                        
                        const serialNumber = assignment ? 
                          equipment.find(eq => eq.id === assignment.equipmentId)?.serialNumber :
                          file.parsedData?.deviceMetadata?.serialNumber;
                        
                        return serialNumber ? (
                          <div className="text-xs text-gray-500">
                            S/N: {serialNumber}
                          </div>
                        ) : null;
                      })()}
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
                      <div>
                        <div className="flex items-center space-x-2">
                          <div className="text-sm font-medium text-gray-900">
                            {file.actualFileName || file.name}
                          </div>
                          <input
                            type="file"
                            accept=".vi2"
                            onChange={(e) => {
                              const uploadedFile = e.target.files?.[0];
                              if (uploadedFile) {
                                handleFileUploadForRow(file.id, uploadedFile);
                              }
                            }}
                            className="hidden"
                            id={`file-upload-${file.id}`}
                          />
                          <label
                            htmlFor={`file-upload-${file.id}`}
                            className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors cursor-pointer flex items-center space-x-1"
                          >
                            <Upload className="w-3 h-3" />
                            <span>Загрузить</span>
                          </label>
                        </div>
                        <div className="text-xs text-gray-500">{file.uploadDate}</div>
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
            <p className="text-sm">Нажмите кнопку "Загрузить файлы в формате Vi2" для добавления файлов</p>
          </div>
        )}
      </div>

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