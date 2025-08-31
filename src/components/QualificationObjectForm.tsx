import React, { useState } from 'react';
import { Building, Car, Refrigerator, Snowflake, Upload, X, FileText, Image as ImageIcon } from 'lucide-react';
import { 
  QualificationObject, 
  QualificationObjectType, 
  QualificationObjectTypeLabels,
  CreateQualificationObjectData 
} from '../types/QualificationObject';
import { qualificationObjectService } from '../utils/qualificationObjectService';

interface QualificationObjectFormProps {
  contractorId: string;
  contractorAddress?: string;
  initialData?: QualificationObject;
  onSubmit: (object: QualificationObject) => void;
  onCancel: () => void;
  hideTypeSelection?: boolean;
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
  hideTypeSelection = false
}) => {
  const [formData, setFormData] = useState<CreateQualificationObjectData>({
    id: initialData?.id || '',
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

  const handleInputChange = (field: keyof CreateQualificationObjectData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (type: 'plan' | 'testData', file: File | null) => {
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

      // Вызываем onSubmit с данными формы
      onSubmit(formData as any);
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
    type 
  }: { 
    title: string; 
    file: File | null; 
    onChange: (file: File | null) => void;
    accept?: string;
    type: 'plan' | 'testData';
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {title}
      </label>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
        {file ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {file.type.startsWith('image/') ? (
                <ImageIcon className="w-5 h-5 text-blue-600" />
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
            >
              <X className="w-4 h-4" />
            </button>
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Введите наименование"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Климатическая система
          </label>
          <input
            type="text"
            value={formData.climateSystem}
            onChange={(e) => handleInputChange('climateSystem', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Введите тип климатической системы"
          />
        </div>
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
        />
      </div>
    </form>
  );
};