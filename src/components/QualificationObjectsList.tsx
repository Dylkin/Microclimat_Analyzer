import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, MapPin, FileImage, Loader, AlertTriangle } from 'lucide-react';
import { 
  QualificationObject, 
  ObjectType, 
  OBJECT_TYPE_METADATA,
  CreateQualificationObjectData,
  UpdateQualificationObjectData,
  RoomData
} from '../types/QualificationObject';
import { qualificationObjectService } from '../utils/qualificationObjectService';
import { QualificationObjectForm } from './QualificationObjectForm';

interface QualificationObjectsListProps {
  contractorId: string;
  contractorName: string;
}

export const QualificationObjectsList: React.FC<QualificationObjectsListProps> = ({
  contractorId,
  contractorName
}) => {
  const [objects, setObjects] = useState<QualificationObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI состояние
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedObjectType, setSelectedObjectType] = useState<ObjectType>('помещение');
  const [editingObject, setEditingObject] = useState<QualificationObject | null>(null);
  const [showObjectOnMap, setShowObjectOnMap] = useState<QualificationObject | null>(null);

  // Загрузка объектов квалификации
  const loadObjects = async () => {
    if (!qualificationObjectService.isAvailable()) {
      setError('Supabase не настроен');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await qualificationObjectService.getObjectsByContractor(contractorId);
      setObjects(data);
    } catch (error) {
      console.error('Ошибка загрузки объектов квалификации:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadObjects();
  }, [contractorId]);

  // Добавление объекта
  const handleAddObject = async (data: CreateQualificationObjectData) => {
    setOperationLoading(true);
    try {
      const newObject = await qualificationObjectService.addObject(data);
      setObjects(prev => [newObject, ...prev]);
      setShowAddForm(false);
      alert('Объект квалификации успешно добавлен');
    } catch (error) {
      console.error('Ошибка добавления объекта:', error);
      alert(`Ошибка добавления объекта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Обновление объекта
  const handleUpdateObject = async (data: UpdateQualificationObjectData) => {
    if (!editingObject) return;

    setOperationLoading(true);
    try {
      const updatedObject = await qualificationObjectService.updateObject(editingObject.id, data);
      setObjects(prev => prev.map(obj => obj.id === editingObject.id ? updatedObject : obj));
      setEditingObject(null);
      alert('Объект квалификации успешно обновлен');
    } catch (error) {
      console.error('Ошибка обновления объекта:', error);
      alert(`Ошибка обновления объекта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Удаление объекта
  const handleDeleteObject = async (objectId: string) => {
    if (confirm('Вы уверены, что хотите удалить этот объект квалификации?')) {
      setOperationLoading(true);
      try {
        await qualificationObjectService.deleteObject(objectId);
        setObjects(prev => prev.filter(obj => obj.id !== objectId));
        alert('Объект квалификации успешно удален');
      } catch (error) {
        console.error('Ошибка удаления объекта:', error);
        alert(`Ошибка удаления объекта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      } finally {
        setOperationLoading(false);
      }
    }
  };

  // Показать объект на карте (для помещений с координатами)
  const canShowOnMap = (obj: QualificationObject): boolean => {
    if (obj.objectType !== 'помещение') return false;
    const roomData = obj.data as RoomData;
    return !!(roomData.latitude && roomData.longitude);
  };

  // Рендер значения поля
  const renderFieldValue = (obj: QualificationObject, field: string, fieldMeta: any): string => {
    const value = (obj.data as any)[field];
    if (value === undefined || value === null || value === '') return '-';
    
    if (fieldMeta.type === 'number' && fieldMeta.unit) {
      return `${value} ${fieldMeta.unit}`;
    }
    
    return value.toString();
  };

  // Группировка объектов по типам
  const objectsByType = objects.reduce((acc, obj) => {
    if (!acc[obj.objectType]) {
      acc[obj.objectType] = [];
    }
    acc[obj.objectType].push(obj);
    return acc;
  }, {} as Record<ObjectType, QualificationObject[]>);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-2">
          <Loader className="animate-spin w-5 h-5 text-indigo-600" />
          <span className="text-gray-700">Загрузка объектов квалификации...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Ошибка загрузки объектов квалификации</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Объекты квалификации для "{contractorName}"
        </h3>
        <div className="flex items-center space-x-3">
          <select
            value={selectedObjectType}
            onChange={(e) => setSelectedObjectType(e.target.value as ObjectType)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {Object.entries(OBJECT_TYPE_METADATA).map(([type, meta]) => (
              <option key={type} value={type}>
                {meta.icon} {meta.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить объект</span>
          </button>
        </div>
      </div>

      {/* Список объектов по типам */}
      {Object.keys(objectsByType).length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-400 mb-4">
            <Plus className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Объекты квалификации не добавлены
          </h3>
          <p className="text-gray-600 mb-4">
            Добавьте первый объект квалификации для этого контрагента
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Добавить объект
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(objectsByType).map(([type, typeObjects]) => {
            const metadata = OBJECT_TYPE_METADATA[type as ObjectType];
            return (
              <div key={type} className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h4 className="text-md font-medium text-gray-900 flex items-center space-x-2">
                    <span>{metadata.icon}</span>
                    <span>{metadata.label}</span>
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                      {typeObjects.length}
                    </span>
                  </h4>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {typeObjects.map((obj) => (
                      <div key={obj.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        {/* Основная информация */}
                        <div className="space-y-2 mb-4">
                          {Object.entries(metadata.fields).map(([field, fieldMeta]) => (
                            <div key={field} className="flex justify-between text-sm">
                              <span className="text-gray-600">{fieldMeta.label}:</span>
                              <span className="font-medium text-gray-900">
                                {renderFieldValue(obj, field, fieldMeta)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* План */}
                        {metadata.supportsPlan && obj.planFileUrl && (
                          <div className="mb-4">
                            <div className="flex items-center space-x-2 text-sm text-green-600">
                              <FileImage className="w-4 h-4" />
                              <span>План загружен</span>
                            </div>
                          </div>
                        )}

                        {/* Действия */}
                        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                          <div className="flex space-x-2">
                            {obj.planFileUrl && (
                              <a
                                href={obj.planFileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                                title="Просмотр плана"
                              >
                                <Eye className="w-4 h-4" />
                              </a>
                            )}
                            {canShowOnMap(obj) && (
                              <button
                                onClick={() => setShowObjectOnMap(obj)}
                                className="text-green-600 hover:text-green-800"
                                title="Показать на карте"
                              >
                                <MapPin className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingObject(obj)}
                              disabled={operationLoading}
                              className="text-indigo-600 hover:text-indigo-800"
                              title="Редактировать"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteObject(obj.id)}
                              disabled={operationLoading}
                              className="text-red-600 hover:text-red-800"
                              title="Удалить"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Форма добавления объекта */}
      {showAddForm && (
        <QualificationObjectForm
          contractorId={contractorId}
          objectType={selectedObjectType}
          onSave={handleAddObject}
          onCancel={() => setShowAddForm(false)}
          loading={operationLoading}
        />
      )}

      {/* Форма редактирования объекта */}
      {editingObject && (
        <QualificationObjectForm
          contractorId={contractorId}
          objectType={editingObject.objectType}
          existingObject={editingObject}
          onSave={handleUpdateObject}
          onCancel={() => setEditingObject(null)}
          loading={operationLoading}
        />
      )}

      {/* Карта для помещений */}
      {showObjectOnMap && showObjectOnMap.objectType === 'помещение' && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Местоположение: {(showObjectOnMap.data as RoomData).name}
              </h3>
              <button
                onClick={() => setShowObjectOnMap(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="h-96">
              {/* Здесь будет карта - аналогично ContractorMap */}
              <div className="flex items-center justify-center h-full bg-gray-100">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Карта объекта</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {(showObjectOnMap.data as RoomData).address}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};