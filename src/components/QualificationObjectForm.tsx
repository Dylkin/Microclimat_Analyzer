import React, { useState } from 'react';
import { Building, Car, Refrigerator, Snowflake, Upload, X, FileText, Image, Eye } from 'lucide-react';
import { 
  QualificationObject, 
  QualificationObjectType, 
  QualificationObjectTypeLabels,
  CreateQualificationObjectData
} from '../types/QualificationObject';
import { qualificationObjectService } from '../utils/qualificationObjectService';
import { QualificationWorkSchedule } from './QualificationWorkSchedule';

interface QualificationObjectFormProps {
  contractorId: string;
  contractorAddress?: string;
  initialData?: QualificationObject;
  onSubmit: (object: QualificationObject) => Promise<QualificationObject>;
  onCancel: () => void;
  hideTypeSelection?: boolean;
  projectId?: string;
  project?: any; // Добавляем полный объект проекта
  onPageChange?: (page: string, data?: any) => void;
  mode?: 'view' | 'edit' | 'create'; // Добавляем режим работы
  hideWorkSchedule?: boolean; // Скрыть блок "План график проведения квалификационных работ" и все его подблоки
}

const getTypeIcon = (type: QualificationObjectType) => {
  switch (type) {
    case 'помещение':
      return <Building className="w-5 h-5" />;
    case 'автомобиль':
      return <Car className="w-5 h-5" />;
    case 'холодильная_камера':
      return <Refrigerator className="w-5 h-5" />;
    case 'холодильник':
    case 'морозильник':
      return <Snowflake className="w-5 h-5" />;
    default:
      return <Building className="w-5 h-5" />;
  }
};

export const QualificationObjectForm: React.FC<QualificationObjectFormProps> = ({
  contractorId,
  contractorAddress,
  initialData,
  onSubmit,
  onCancel,
  hideTypeSelection = false,
  projectId,
  project,
  onPageChange,
  mode = 'create',
  hideWorkSchedule = false
}) => {
  // Все хуки должны быть вызваны до любых условных возвратов
  console.log('QualificationObjectForm получил projectId:', projectId);
  const [formData, setFormData] = useState<CreateQualificationObjectData>({
    contractorId,
    type: initialData?.type || 'помещение',
    name: initialData?.name || '',
    manufacturer: initialData?.manufacturer || '',
    climateSystem: initialData?.climateSystem || '',
    address: initialData?.address || contractorAddress || '',
    area: initialData?.area || undefined,
    vin: initialData?.vin || '',
    registrationNumber: initialData?.registrationNumber || '',
    bodyVolume: initialData?.bodyVolume || undefined,
    inventoryNumber: initialData?.inventoryNumber || '',
    chamberVolume: initialData?.chamberVolume || undefined,
    serialNumber: initialData?.serialNumber || ''
  });

  const [planFile, setPlanFile] = useState<File | null>(null);
  const [testDataFile, setTestDataFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedPlanUrl, setUploadedPlanUrl] = useState<string | null>(initialData?.planFileUrl || null);


  const handleInputChange = (field: keyof CreateQualificationObjectData, value: any) => {
    if (mode === 'view') return; // Не изменяем данные в режиме просмотра
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (type: 'plan' | 'testData', file: File | null) => {
    if (mode === 'view') return; // Не изменяем файлы в режиме просмотра
    if (type === 'plan') {
      setPlanFile(file);
    } else {
      setTestDataFile(file);
    }
  };

  const validateFile = (file: File, type: 'plan' | 'testData'): string | null => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (file.size > maxSize) {
      return 'Размер файла не должен превышать 10MB';
    }

    if (type === 'plan') {
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'image/tiff', 'image/bmp'];
      if (!allowedTypes.includes(file.type)) {
        return 'Поддерживаются только файлы: JPG, PNG, PDF, TIFF, BMP';
      }
    } else {
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'image/tiff', 'image/bmp'];
      if (!allowedTypes.includes(file.type)) {
        return 'Поддерживаются только файлы: JPG, PNG, PDF, TIFF, BMP';
      }
    }

    return null;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {

      // Валидация файлов
      if (planFile) {
        const planError = validateFile(planFile, 'plan');
        if (planError) {
          setError(planError);
          setLoading(false);
          return;
        }
      }

      if (testDataFile) {
        const testDataError = validateFile(testDataFile, 'testData');
        if (testDataError) {
          setError(testDataError);
          setLoading(false);
          return;
        }
      }

      // Сначала сохраняем объект квалификации
      const finalFormData = {
        ...formData,
        id: initialData?.id, // Добавляем ID для обновления существующего объекта
        // projectId добавляется отдельно через параметры функции, не через initialData
      };
      
      // Вызываем onSubmit для сохранения объекта и получаем сохраненный объект с ID
      const savedObject = await onSubmit(finalFormData as any);
      
      // Получаем ID сохраненного объекта (для новых объектов это будет ID из базы данных)
      const objectId = savedObject?.id || finalFormData.id;
      
      // После сохранения объекта загружаем файлы, если они есть
      if (planFile && objectId) {
        try {
          const planUrl = await qualificationObjectService.uploadPlanFile(objectId, planFile);
          setUploadedPlanUrl(planUrl);
          console.log('Файл плана успешно загружен');
        } catch (error) {
          console.error('Ошибка загрузки файла плана:', error);
          setError(`Ошибка загрузки файла плана: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
          return;
        }
      }
      
      if (testDataFile && objectId) {
        try {
          await qualificationObjectService.uploadTestDataFile(objectId, testDataFile);
          console.log('Файл данных испытаний успешно загружен');
        } catch (error) {
          console.error('Ошибка загрузки файла данных испытаний:', error);
          setError(`Ошибка загрузки файла данных испытаний: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
          return;
        }
      }
    } catch (error) {
      console.error('Ошибка сохранения объекта:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  // Отображаем все поля для всех типов объектов
  const renderTypeSpecificFields = () => {
    switch (formData.type) {
      case 'автомобиль':
        return (
          <div className="space-y-4">
            {/* VIN номер */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                VIN номер
              </label>
              <input
                type="text"
                value={formData.vin || ''}
                onChange={(e) => handleInputChange('vin', e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${mode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                readOnly={mode === 'view'}
                placeholder="Введите VIN номер"
              />
            </div>

            {/* Регистрационный номер */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Регистрационный номер
              </label>
              <input
                type="text"
                value={formData.registrationNumber || ''}
                onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${mode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                readOnly={mode === 'view'}
                placeholder="Введите регистрационный номер"
              />
            </div>

            {/* Объем кузова */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Объем кузова (м³)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.bodyVolume || ''}
                onChange={(e) => handleInputChange('bodyVolume', e.target.value ? parseFloat(e.target.value) : undefined)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${mode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                readOnly={mode === 'view'}
                placeholder="Введите объем кузова"
              />
            </div>
          </div>
        );
      
      case 'помещение':
        return (
          <div className="space-y-4">
            {/* Площадь */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Площадь (м²)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.area || ''}
                onChange={(e) => handleInputChange('area', e.target.value ? parseFloat(e.target.value) : undefined)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${mode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                readOnly={mode === 'view'}
                placeholder="Введите площадь"
              />
            </div>
          </div>
        );
      
      case 'холодильная_камера':
        return (
          <div className="space-y-4">
            {/* Производитель */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Производитель
              </label>
              <input
                type="text"
                value={formData.manufacturer || ''}
                onChange={(e) => handleInputChange('manufacturer', e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${mode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                readOnly={mode === 'view'}
                placeholder="Введите производителя"
              />
            </div>

            {/* Инвентарный номер */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Инвентарный номер
              </label>
              <input
                type="text"
                value={formData.inventoryNumber || ''}
                onChange={(e) => handleInputChange('inventoryNumber', e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${mode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                readOnly={mode === 'view'}
                placeholder="Введите инвентарный номер"
              />
            </div>

            {/* Объем камеры */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Объем камеры (м³/л)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.chamberVolume || ''}
                onChange={(e) => handleInputChange('chamberVolume', e.target.value ? parseFloat(e.target.value) : undefined)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${mode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                readOnly={mode === 'view'}
                placeholder="Введите объем камеры"
              />
            </div>
          </div>
        );
      
      case 'холодильник':
      case 'морозильник':
        return (
          <div className="space-y-4">
            {/* Производитель */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Производитель
              </label>
              <input
                type="text"
                value={formData.manufacturer || ''}
                onChange={(e) => handleInputChange('manufacturer', e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${mode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                readOnly={mode === 'view'}
                placeholder="Введите производителя"
              />
            </div>

            {/* Серийный номер */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Серийный номер
              </label>
              <input
                type="text"
                value={formData.serialNumber || ''}
                onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${mode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                readOnly={mode === 'view'}
                placeholder="Введите серийный номер"
              />
            </div>

            {/* Инвентарный номер */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Инвентарный номер
              </label>
              <input
                type="text"
                value={formData.inventoryNumber || ''}
                onChange={(e) => handleInputChange('inventoryNumber', e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${mode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                readOnly={mode === 'view'}
                placeholder="Введите инвентарный номер"
              />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  const renderAllFields = () => (
    <div className="space-y-4">
      {/* Площадь */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Площадь (м²)
        </label>
        <input
          type="number"
          step="0.01"
          value={formData.area || ''}
          onChange={(e) => handleInputChange('area', e.target.value ? parseFloat(e.target.value) : undefined)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Введите площадь"
        />
      </div>

      {/* VIN номер */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          VIN номер
        </label>
        <input
          type="text"
          value={formData.vin || ''}
          onChange={(e) => handleInputChange('vin', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Введите VIN номер"
        />
      </div>

      {/* Регистрационный номер */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Регистрационный номер
        </label>
        <input
          type="text"
          value={formData.registrationNumber || ''}
          onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Введите регистрационный номер"
        />
      </div>

      {/* Объем кузова */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Объем кузова (м³)
        </label>
        <input
          type="number"
          step="0.01"
          value={formData.bodyVolume || ''}
          onChange={(e) => handleInputChange('bodyVolume', e.target.value ? parseFloat(e.target.value) : undefined)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Введите объем кузова"
        />
      </div>

      {/* Инвентарный номер */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Инвентарный номер
        </label>
        <input
          type="text"
          value={formData.inventoryNumber || ''}
          onChange={(e) => handleInputChange('inventoryNumber', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Введите инвентарный номер"
        />
      </div>

      {/* Объем камеры */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Объем камеры (м³/л)
        </label>
        <input
          type="number"
          step="0.01"
          value={formData.chamberVolume || ''}
          onChange={(e) => handleInputChange('chamberVolume', e.target.value ? parseFloat(e.target.value) : undefined)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Введите объем камеры"
        />
      </div>

      {/* Серийный номер */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Серийный номер
        </label>
        <input
          type="text"
          value={formData.serialNumber || ''}
          onChange={(e) => handleInputChange('serialNumber', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Введите серийный номер"
        />
      </div>
    </div>
  );

  const FileUploadField = ({ 
    title, 
    file, 
    onChange, 
    accept = "image/*,.pdf",
    type,
    uploadedUrl
  }: { 
    title: string; 
    file: File | null; 
    onChange: (file: File | null) => void;
    accept?: string;
    type: 'plan' | 'testData';
    uploadedUrl?: string | null;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {title}
      </label>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
        {file ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {file.type.startsWith('image/') ? (
                  <Image className="w-5 h-5 text-blue-600" />
                ) : (
                  <FileText className="w-5 h-5 text-red-600" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="text-red-600 hover:text-red-800"
                title="Удалить файл"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {uploadedUrl && (
              <div className="flex items-center space-x-2 p-2 bg-green-50 border border-green-200 rounded-md">
                <Eye className="w-4 h-4 text-green-600" />
                <a
                  href={uploadedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-700 hover:text-green-800 underline"
                >
                  Просмотреть загруженный файл
                </a>
              </div>
            )}
          </div>
        ) : uploadedUrl ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 p-2 bg-green-50 border border-green-200 rounded-md">
              <Eye className="w-4 h-4 text-green-600" />
              <a
                href={uploadedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green-700 hover:text-green-800 underline"
              >
                Просмотреть загруженный файл
              </a>
            </div>
            <label className="cursor-pointer block">
              <input
                type="file"
                accept={accept}
                onChange={(e) => onChange(e.target.files?.[0] || null)}
                className="hidden"
              />
              <div className="text-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Заменить файл
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {type === 'plan' ? 'JPG, PNG, PDF, TIFF, BMP до 10MB' : 'JPG, PNG, PDF, TIFF, BMP до 10MB'}
                </p>
              </div>
            </label>
          </div>
        ) : (
          <label className="cursor-pointer block">
            <input
              type="file"
              accept={accept}
              onChange={(e) => onChange(e.target.files?.[0] || null)}
              className="hidden"
            />
            <div className="text-center">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                Нажмите для выбора файла
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {type === 'plan' ? 'JPG, PNG, PDF, TIFF, BMP до 10MB' : 'JPG, PNG, PDF, TIFF, BMP до 10MB'}
              </p>
            </div>
          </label>
        )}
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Тип объекта */}
      {!hideTypeSelection && (
        <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Тип объекта *
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(QualificationObjectTypeLabels).map(([type, label]) => (
            <button
              key={type}
              type="button"
              onClick={() => handleInputChange('type', type as QualificationObjectType)}
              className={`p-3 border rounded-lg flex items-center space-x-2 transition-colors ${
                formData.type === type
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              {getTypeIcon(type as QualificationObjectType)}
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
        </div>
      )}

      {/* Общая информация */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Общая информация</h3>
        
        <div className="space-y-4">
          {/* Основные поля */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Наименование
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${mode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                readOnly={mode === 'view'}
                placeholder="Введите наименование"
              />
            </div>

            {/* Климатическая установка - не отображается для холодильника и морозильника */}
            {formData.type !== 'холодильник' && formData.type !== 'морозильник' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Климатическая установка
                </label>
                <input
                  type="text"
                  value={formData.climateSystem}
                  onChange={(e) => handleInputChange('climateSystem', e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${mode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  readOnly={mode === 'view'}
                  placeholder="Введите тип климатической системы"
                />
              </div>
            )}
          </div>

          {/* Адрес */}
          {formData.type !== 'автомобиль' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Адрес
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${mode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                readOnly={mode === 'view'}
                placeholder="Введите адрес"
              />
            </div>
          )}

          {/* Специфичные для типа поля */}
          {renderTypeSpecificFields()}

          {/* Файлы */}
          <div className="grid grid-cols-1 gap-6">
            <FileUploadField
              title="План объекта"
              file={planFile}
              onChange={(file) => handleFileChange('plan', file)}
              type="plan"
              uploadedUrl={uploadedPlanUrl}
            />
          </div>
        </div>

        {/* Кнопки управления */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <X className="w-4 h-4 mr-2" />
            {mode === 'view' ? 'Закрыть' : 'Отмена'}
          </button>
          {mode !== 'view' && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Сохранение...
                </>
              ) : (
                mode === 'edit' ? 'Сохранить изменения' : 'Сохранить'
              )}
            </button>
          )}
        </div>
      </div>

      {/* План график проведения квалификационных работ - только для существующих объектов и когда есть projectId, и не скрыт через hideWorkSchedule */}
      {initialData && projectId && !hideWorkSchedule && (
        <div className="border-t border-gray-200 pt-6">
          <QualificationWorkSchedule
            qualificationObjectId={initialData.id}
            qualificationObjectName={initialData.name || initialData.vin || initialData.serialNumber || 'Без названия'}
            projectId={projectId}
            project={project}
            onPageChange={onPageChange}
            mode={mode === 'create' ? 'edit' : (mode || 'edit')}
            hideTestDocuments={hideWorkSchedule}
          />
        </div>
      )}


    </form>
  );
};