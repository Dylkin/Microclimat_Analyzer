import React, { useState } from 'react';
import { Plus, X, Upload, MapPin, FileImage } from 'lucide-react';
import { 
  QualificationObjectType, 
  QualificationObjectTypeLabels,
  CreateQualificationObjectData 
} from '../types/QualificationObject';

interface QualificationObjectFormProps {
  contractorId: string;
  onAdd: (objectData: CreateQualificationObjectData) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const QualificationObjectForm: React.FC<QualificationObjectFormProps> = ({
  contractorId,
  onAdd,
  onCancel,
  loading = false
}) => {
  const [objectData, setObjectData] = useState<CreateQualificationObjectData>({
    contractorId,
    type: 'помещение'
  });

  const [planFile, setPlanFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация обязательных полей в зависимости от типа
    if (!validateRequiredFields()) {
      return;
    }

    const submitData = {
      ...objectData,
      planFile: planFile || undefined
    };

    onAdd(submitData);
  };

  const validateRequiredFields = (): boolean => {
    switch (objectData.type) {
      case 'помещение':
        if (!objectData.name) {
          alert('Введите наименование помещения');
          return false;
        }
        break;
      case 'автомобиль':
        if (!objectData.vin) {
          alert('Введите VIN номер автомобиля');
          return false;
        }
        break;
      case 'холодильная_камера':
        if (!objectData.name) {
          alert('Введите наименование холодильной камеры');
          return false;
        }
        break;
      case 'холодильник':
      case 'морозильник':
        if (!objectData.serialNumber) {
          alert('Введите серийный номер');
          return false;
        }
        break;
    }
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'image/jpeg') {
        alert('Можно загружать только файлы в формате JPG');
        return;
      }
      setPlanFile(file);
    }
  };

  const renderTypeSpecificFields = () => {
    switch (objectData.type) {
      case 'помещение':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Наименование *
              </label>
              <input
                type="text"
                value={objectData.name || ''}
                onChange={(e) => setObjectData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите наименование помещения"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Адрес
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={objectData.address || ''}
                  onChange={(e) => setObjectData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Введите адрес (будет геокодирован автоматически)"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Площадь (м²)
              </label>
              <input
                type="number"
                step="0.01"
                value={objectData.area || ''}
                onChange={(e) => setObjectData(prev => ({ ...prev, area: parseFloat(e.target.value) || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите площадь"
              />
            </div>
          </>
        );

      case 'автомобиль':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                VIN номер *
              </label>
              <input
                type="text"
                value={objectData.vin || ''}
                onChange={(e) => setObjectData(prev => ({ ...prev, vin: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите VIN номер"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Регистрационный номер
              </label>
              <input
                type="text"
                value={objectData.registrationNumber || ''}
                onChange={(e) => setObjectData(prev => ({ ...prev, registrationNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите регистрационный номер"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Объем кузова (м³)
              </label>
              <input
                type="number"
                step="0.01"
                value={objectData.bodyVolume || ''}
                onChange={(e) => setObjectData(prev => ({ ...prev, bodyVolume: parseFloat(e.target.value) || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите объем кузова"
              />
            </div>
          </>
        );

      case 'холодильная_камера':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Наименование *
              </label>
              <input
                type="text"
                value={objectData.name || ''}
                onChange={(e) => setObjectData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите наименование камеры"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Инвентарный номер
              </label>
              <input
                type="text"
                value={objectData.inventoryNumber || ''}
                onChange={(e) => setObjectData(prev => ({ ...prev, inventoryNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите инвентарный номер"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Объем камеры (м³)
              </label>
              <input
                type="number"
                step="0.01"
                value={objectData.chamberVolume || ''}
                onChange={(e) => setObjectData(prev => ({ ...prev, chamberVolume: parseFloat(e.target.value) || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите объем камеры"
              />
            </div>
          </>
        );

      case 'холодильник':
      case 'морозильник':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Серийный номер *
              </label>
              <input
                type="text"
                value={objectData.serialNumber || ''}
                onChange={(e) => setObjectData(prev => ({ ...prev, serialNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите серийный номер"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Инвентарный номер
              </label>
              <input
                type="text"
                value={objectData.inventoryNumber || ''}
                onChange={(e) => setObjectData(prev => ({ ...prev, inventoryNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите инвентарный номер"
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  const showClimateSystem = ['помещение', 'автомобиль', 'холодильная_камера'].includes(objectData.type);
  const showPlanFile = ['помещение', 'холодильная_камера', 'холодильник', 'морозильник'].includes(objectData.type);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Добавить объект квалификации</h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Тип объекта */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Тип объекта *
          </label>
          <select
            value={objectData.type}
            onChange={(e) => setObjectData(prev => ({ 
              ...prev, 
              type: e.target.value as QualificationObjectType,
              // Сбрасываем поля при смене типа
              name: undefined,
              address: undefined,
              area: undefined,
              vin: undefined,
              registrationNumber: undefined,
              bodyVolume: undefined,
              inventoryNumber: undefined,
              chamberVolume: undefined,
              serialNumber: undefined
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {Object.entries(QualificationObjectTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Поля в зависимости от типа */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderTypeSpecificFields()}
        </div>

        {/* Климатическая установка */}
        {showClimateSystem && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Климатическая установка
            </label>
            <input
              type="text"
              value={objectData.climateSystem || ''}
              onChange={(e) => setObjectData(prev => ({ ...prev, climateSystem: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Введите тип климатической установки"
            />
          </div>
        )}

        {/* Загрузка файла плана */}
        {showPlanFile && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              План (JPG файл)
            </label>
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <Upload className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Выбрать файл</span>
                <input
                  type="file"
                  accept="image/jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {planFile && (
                <div className="flex items-center space-x-2">
                  <FileImage className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-600">{planFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setPlanFile(null)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Добавление...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Сохранить</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};