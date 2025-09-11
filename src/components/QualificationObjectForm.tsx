import React, { useState } from 'react';
import { Building, Car, Refrigerator, Snowflake, Upload, X, FileText, Image, Plus, Trash2, MapPin } from 'lucide-react';
import { 
  QualificationObject, 
  QualificationObjectType, 
  QualificationObjectTypeLabels,
  CreateQualificationObjectData,
  MeasurementZone,
  MeasurementLevel
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
  const [measurementZones, setMeasurementZones] = useState<MeasurementZone[]>(
    initialData?.measurementZones || []
  );

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

  // Управление зонами измерения
  const addMeasurementZone = () => {
    const nextZoneNumber = measurementZones.length > 0 
      ? Math.max(...measurementZones.map(z => z.zoneNumber)) + 1 
      : 1;
    
    // Копируем уровни из предыдущей зоны, если она существует
    let measurementLevels: MeasurementLevel[] = [];
    if (measurementZones.length > 0) {
      // Берем уровни из последней добавленной зоны
      const lastZone = measurementZones[measurementZones.length - 1];
      measurementLevels = lastZone.measurementLevels.map(level => ({
        id: crypto.randomUUID(),
        level: level.level
      }));
    }
    
    const newZone: MeasurementZone = {
      id: crypto.randomUUID(),
      zoneNumber: nextZoneNumber,
      measurementLevels: measurementLevels
    };
    
    setMeasurementZones(prev => [...prev, newZone]);
  };

  const removeMeasurementZone = (zoneId: string) => {
    setMeasurementZones(prev => prev.filter(zone => zone.id !== zoneId));
  };

  const addMeasurementLevel = (zoneId: string) => {
    const newLevel: MeasurementLevel = {
      id: crypto.randomUUID(),
      level: 0.0
    };
    
    setMeasurementZones(prev => prev.map(zone => 
      zone.id === zoneId 
        ? { ...zone, measurementLevels: [...zone.measurementLevels, newLevel] }
        : zone
    ));
  };

  const removeMeasurementLevel = (zoneId: string, levelId: string) => {
    setMeasurementZones(prev => prev.map(zone => 
      zone.id === zoneId 
        ? { ...zone, measurementLevels: zone.measurementLevels.filter(level => level.id !== levelId) }
        : zone
    ));
  };

  const updateMeasurementLevel = (zoneId: string, levelId: string, newLevel: number) => {
    setMeasurementZones(prev => prev.map(zone => 
      zone.id === zoneId 
        ? { 
            ...zone, 
            measurementLevels: zone.measurementLevels.map(level => 
              level.id === levelId ? { ...level, level: newLevel } : level
            ) 
          }
        : zone
    ));
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
      const finalFormData = {
        ...formData,
        measurementZones: measurementZones.map(zone => ({
          zoneNumber: zone.zoneNumber,
          measurementLevels: zone.measurementLevels
        }))
      };
      
      onSubmit(finalFormData as any);
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

      {/* Расстановка оборудования */}
      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Расстановка оборудования</h3>
          <button
            type="button"
            onClick={addMeasurementZone}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить зону измерения</span>
          </button>
        </div>

        {measurementZones.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">Зоны измерения не добавлены</p>
            <p className="text-xs mt-1">Нажмите "Добавить зону измерения" для создания первой зоны</p>
          </div>
        ) : (
          <div className="space-y-4">
            {measurementZones.map((zone) => (
              <div key={zone.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5 text-indigo-600" />
                    <h4 className="text-md font-medium text-gray-900">
                      Зона измерения № {zone.zoneNumber}
                    </h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => addMeasurementLevel(zone.id)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors flex items-center space-x-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Добавить уровень</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeMeasurementZone(zone.id)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                      title="Удалить зону"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Уровни измерения */}
                {zone.measurementLevels.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 bg-white rounded border border-gray-200">
                    <p className="text-sm">Уровни измерения не добавлены</p>
                    <p className="text-xs mt-1">Нажмите "Добавить уровень" для создания первого уровня</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {zone.measurementLevels.map((level, levelIndex) => (
                      <div key={level.id} className="bg-white border border-gray-200 rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-gray-700">
                            Уровень {levelIndex + 1}
                          </label>
                          <button
                            type="button"
                            onClick={() => removeMeasurementLevel(zone.id, level.id)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Удалить уровень"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="10"
                            value={level.level}
                            onChange={(e) => updateMeasurementLevel(
                              zone.id, 
                              level.id, 
                              parseFloat(e.target.value) || 0
                            )}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                            placeholder="0.0"
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                            м
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Информация о расстановке */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Информация о расстановке оборудования:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Номера зон измерения присваиваются автоматически по формуле n+1</li>
            <li>• Для каждой зоны можно добавить несколько уровней измерения</li>
            <li>• Уровень измерения указывается в метрах с точностью до 0.1 м</li>
            <li>• Максимальный уровень измерения: 10.0 м</li>
            <li>• Данные о расстановке используются при планировании испытаний</li>
          </ul>
        </div>
      </div>

      {/* Кнопки */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
        >
          {loading && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          <span>{initialData ? 'Сохранить' : 'Создать'}</span>
        </button>
      </div>
    </form>
  );
};