import React, { useState } from 'react';
import { Plus, X, Upload, MapPin, FileImage, FileText } from 'lucide-react';
import { 
  QualificationObjectType, 
  QualificationObjectTypeLabels,
  QualificationObject,
  qualificationObjectService
} from '../../utils/qualificationObjectService';

interface QualificationObjectFormProps {
  contractorId: string;
  contractorName: string;
  editingObject?: QualificationObject | null;
  onSubmit: (data: Partial<QualificationObject> & { planFile?: File; testDataFile?: File }) => void;
  onCancel: () => void;
}

export const QualificationObjectForm: React.FC<QualificationObjectFormProps> = ({
  contractorId,
  contractorName,
  editingObject,
  onSubmit,
  onCancel
}) => {
  const [objectData, setObjectData] = useState<Partial<QualificationObject>>(() => {
    if (editingObject) {
      return {
        type: editingObject.type,
        name: editingObject.name,
        address: editingObject.address,
        coordinates: editingObject.coordinates,
        bodyVolume: editingObject.bodyVolume,
        inventoryNumber: editingObject.inventoryNumber,
        chamberVolume: editingObject.chamberVolume,
        serialNumber: editingObject.serialNumber,
        testDataFileUrl: editingObject.testDataFileUrl,
        testDataFileName: editingObject.testDataFileName
      };
    }
    
    return {
      type: QualificationObjectType.SEPTIC_TANK,
      name: '',
      address: '',
      coordinates: '',
      bodyVolume: 0,
      inventoryNumber: '',
      chamberVolume: 0,
      serialNumber: ''
    };
  });

  const [planFile, setPlanFile] = useState<File | null>(null);
  const [testDataFile, setTestDataFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!objectData.name?.trim()) {
      alert('Введите название объекта');
      return;
    }
    
    if (!objectData.address?.trim()) {
      alert('Введите адрес объекта');
      return;
    }

    const submitData = {
      ...objectData,
      planFile: planFile || undefined,
      testDataFile: testDataFile || undefined
    };

    onSubmit(submitData);
  };

  const handleInputChange = (field: keyof QualificationObject, value: any) => {
    setObjectData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        alert('Можно загружать только файлы в формате JPG или PNG');
        return;
      }
      setPlanFile(file);
    }
  };

  const handleTestDataFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = [
        'image/jpeg',
        'image/png', 
        'application/pdf',
        'image/tiff',
        'image/bmp'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        alert('Поддерживаются файлы: JPG, PNG, PDF, TIFF, BMP');
        return;
      }
      
      // Проверяем размер файла (максимум 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Размер файла не должен превышать 10MB');
        return;
      }
      
      setTestDataFile(file);
    }
  };

  const renderTypeSpecificFields = () => {
    switch (objectData.type) {
      case QualificationObjectType.SEPTIC_TANK:
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Объем корпуса (м³) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={objectData.bodyVolume || ''}
                onChange={(e) => handleInputChange('bodyVolume', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Инвентарный номер
              </label>
              <input
                type="text"
                value={objectData.inventoryNumber || ''}
                onChange={(e) => handleInputChange('inventoryNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </>
        );
      
      case QualificationObjectType.PUMPING_STATION:
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Объем камеры (м³) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={objectData.chamberVolume || ''}
                onChange={(e) => handleInputChange('chamberVolume', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Серийный номер
              </label>
              <input
                type="text"
                value={objectData.serialNumber || ''}
                onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </>
        );
      
      default:
        return null;
    }
  };

  const showPlanFile = objectData.type === QualificationObjectType.SEPTIC_TANK;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          {editingObject ? 'Редактировать объект' : 'Добавить объект квалификации'}
        </h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Тип объекта *
          </label>
          <select
            value={objectData.type}
            onChange={(e) => handleInputChange('type', e.target.value as QualificationObjectType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          >
            {Object.values(QualificationObjectType).map(type => (
              <option key={type} value={type}>
                {QualificationObjectTypeLabels[type]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Название объекта *
          </label>
          <input
            type="text"
            value={objectData.name || ''}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Например: Септик №1"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Адрес *
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={objectData.address || ''}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Полный адрес объекта"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Координаты
          </label>
          <input
            type="text"
            value={objectData.coordinates || ''}
            onChange={(e) => handleInputChange('coordinates', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Например: 55.7558, 37.6176"
          />
        </div>

        {renderTypeSpecificFields()}

        {/* Загрузка файла плана */}
        {showPlanFile && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              План (JPG/PNG файл)
            </label>
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <Upload className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Выбрать файл</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
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

        {/* Загрузка данных по испытаниям */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Данные по испытаниям (изображения, PDF)
          </label>
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <Upload className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Выбрать файл</span>
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf,image/tiff,image/bmp"
                onChange={handleTestDataFileChange}
                className="hidden"
              />
            </label>
            {testDataFile && (
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-600">{testDataFile.name}</span>
                <span className="text-xs text-gray-500">
                  ({(testDataFile.size / 1024 / 1024).toFixed(1)} MB)
                </span>
                <button
                  type="button"
                  onClick={() => setTestDataFile(null)}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Поддерживаются: JPG, PNG, PDF, TIFF, BMP (максимум 10MB)
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Отмена
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {editingObject ? 'Сохранить' : 'Добавить'}
          </button>
        </div>
      </form>
    </div>
  );
};