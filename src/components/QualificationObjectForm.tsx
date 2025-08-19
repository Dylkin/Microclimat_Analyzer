import React, { useState, useEffect } from 'react';
import { X, Upload, Trash2, MapPin, Save } from 'lucide-react';
import { 
  ObjectType, 
  CreateQualificationObjectData, 
  UpdateQualificationObjectData,
  QualificationObject,
  OBJECT_TYPE_METADATA,
  RoomData,
  VehicleData,
  ColdRoomData,
  RefrigeratorData,
  FreezerData
} from '../types/QualificationObject';

interface QualificationObjectFormProps {
  contractorId: string;
  objectType: ObjectType;
  existingObject?: QualificationObject;
  onSave: (data: CreateQualificationObjectData | UpdateQualificationObjectData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export const QualificationObjectForm: React.FC<QualificationObjectFormProps> = ({
  contractorId,
  objectType,
  existingObject,
  onSave,
  onCancel,
  loading = false
}) => {
  const metadata = OBJECT_TYPE_METADATA[objectType];
  const isEditing = !!existingObject;

  // Состояние формы
  const [formData, setFormData] = useState<any>({});
  const [planFile, setPlanFile] = useState<File | null>(null);
  const [removePlanFile, setRemovePlanFile] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Инициализация формы
  useEffect(() => {
    if (existingObject) {
      setFormData(existingObject.data);
    } else {
      // Инициализируем пустую форму
      const initialData: any = {};
      Object.keys(metadata.fields).forEach(field => {
        initialData[field] = '';
      });
      setFormData(initialData);
    }
  }, [existingObject, metadata.fields]);

  // Обработка изменения полей
  const handleFieldChange = (field: string, value: string | number) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }));
    
    // Очищаем ошибку для этого поля
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Обработка загрузки файла
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Проверяем тип файла
      if (!file.type.startsWith('image/')) {
        alert('Можно загружать только изображения (JPG, PNG)');
        return;
      }
      
      setPlanFile(file);
      setRemovePlanFile(false);
    }
  };

  // Удаление файла плана
  const handleRemovePlanFile = () => {
    setPlanFile(null);
    setRemovePlanFile(true);
  };

  // Валидация формы
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    Object.entries(metadata.fields).forEach(([field, fieldMeta]) => {
      if (fieldMeta.required && (!formData[field] || formData[field].toString().trim() === '')) {
        newErrors[field] = `${fieldMeta.label} обязательно для заполнения`;
      }
      
      if (fieldMeta.type === 'number' && formData[field] && isNaN(Number(formData[field]))) {
        newErrors[field] = `${fieldMeta.label} должно быть числом`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Отправка формы
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      if (isEditing) {
        // Обновление существующего объекта
        const updateData: UpdateQualificationObjectData = {
          data: formData
        };
        
        if (planFile) {
          updateData.planFile = planFile;
        }
        
        if (removePlanFile) {
          updateData.removePlanFile = true;
        }
        
        await onSave(updateData);
      } else {
        // Создание нового объекта
        const createData: CreateQualificationObjectData = {
          contractorId,
          objectType,
          data: formData
        };
        
        if (planFile) {
          createData.planFile = planFile;
        }
        
        await onSave(createData);
      }
    } catch (error) {
      console.error('Ошибка сохранения объекта:', error);
    }
  };

  // Рендер поля формы
  const renderField = (field: string, fieldMeta: any) => {
    const value = formData[field] || '';
    const error = errors[field];

    return (
      <div key={field}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {fieldMeta.label}
          {fieldMeta.required && <span className="text-red-500 ml-1">*</span>}
          {fieldMeta.unit && <span className="text-gray-500 ml-1">({fieldMeta.unit})</span>}
        </label>
        
        {fieldMeta.type === 'address' ? (
          <div className="relative">
            <input
              type="text"
              value={value}
              onChange={(e) => handleFieldChange(field, e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                error ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder={`Введите ${fieldMeta.label.toLowerCase()}`}
            />
            <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        ) : (
          <input
            type={fieldMeta.type === 'number' ? 'number' : 'text'}
            value={value}
            onChange={(e) => handleFieldChange(field, fieldMeta.type === 'number' ? Number(e.target.value) : e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
              error ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder={`Введите ${fieldMeta.label.toLowerCase()}`}
            step={fieldMeta.type === 'number' ? '0.01' : undefined}
          />
        )}
        
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Заголовок */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              <span className="mr-2">{metadata.icon}</span>
              {isEditing ? 'Редактировать' : 'Добавить'} {metadata.label.toLowerCase()}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Поля формы */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(metadata.fields).map(([field, fieldMeta]) =>
                renderField(field, fieldMeta)
              )}
            </div>

            {/* Загрузка файла плана */}
            {metadata.supportsPlan && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  План (JPG изображение)
                </label>
                
                {/* Текущий файл */}
                {existingObject?.planFileUrl && !removePlanFile && !planFile && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Upload className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-gray-700">
                          {existingObject.planFileName || 'План загружен'}
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <a
                          href={existingObject.planFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Просмотр
                        </a>
                        <button
                          type="button"
                          onClick={handleRemovePlanFile}
                          className="text-red-600 hover:text-red-800"
                          title="Удалить план"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Новый файл */}
                {planFile && (
                  <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Upload className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-gray-700">
                          {planFile.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPlanFile(null)}
                        className="text-red-600 hover:text-red-800"
                        title="Удалить выбранный файл"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Поле загрузки */}
                {!planFile && (removePlanFile || !existingObject?.planFileUrl) && (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="plan-file-upload"
                    />
                    <label
                      htmlFor="plan-file-upload"
                      className="cursor-pointer flex flex-col items-center space-y-2"
                    >
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Нажмите для загрузки плана
                      </span>
                      <span className="text-xs text-gray-500">
                        Поддерживаются JPG, PNG изображения
                      </span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Кнопки */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
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
                    <span>Сохранение...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{isEditing ? 'Обновить' : 'Добавить'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};