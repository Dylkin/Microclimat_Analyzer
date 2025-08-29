import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Save, X, Building, Car, Refrigerator, Snowflake, MapPin, Trash2 } from 'lucide-react';
import { QualificationObject, QualificationObjectTypeLabels, CreateQualificationObjectData } from '../../types/QualificationObject';
import { qualificationObjectService } from '../../utils/qualificationObjectService';
import { QualificationObjectForm } from '../QualificationObjectForm';

interface QualificationObjectsCRUDProps {
  contractorId: string;
  contractorName: string;
}

export const QualificationObjectsCRUD: React.FC<QualificationObjectsCRUDProps> = ({ 
  contractorId, 
  contractorName 
}) => {
  const [objects, setObjects] = useState<QualificationObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingObject, setEditingObject] = useState<QualificationObject | null>(null);

  // Загрузка объектов квалификации
  const loadObjects = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await qualificationObjectService.getQualificationObjectsByContractor(contractorId);
      setObjects(data);
    } catch (error) {
      console.error('Ошибка загрузки объектов:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadObjects();
  }, [contractorId]);

  // Создание нового объекта
  const handleCreate = async (data: CreateQualificationObjectData) => {
    try {
      const newObject = await qualificationObjectService.createQualificationObject({
        ...data,
        contractorId
      });
      setObjects(prev => [newObject, ...prev]);
      setShowForm(false);
    } catch (error) {
      console.error('Ошибка создания объекта:', error);
      alert(`Ошибка создания объекта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  // Обновление объекта
  const handleUpdate = async (id: string, data: Partial<CreateQualificationObjectData>) => {
    try {
      const updatedObject = await qualificationObjectService.updateQualificationObject(id, data);
      setObjects(prev => prev.map(obj => obj.id === id ? updatedObject : obj));
      setEditingObject(null);
    } catch (error) {
      console.error('Ошибка обновления объекта:', error);
      alert(`Ошибка обновления объекта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  // Удаление объекта
  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот объект квалификации?')) {
      return;
    }

    try {
      await qualificationObjectService.deleteQualificationObject(id);
      setObjects(prev => prev.filter(obj => obj.id !== id));
    } catch (error) {
      console.error('Ошибка удаления объекта:', error);
      alert(`Ошибка удаления объекта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  // Получение иконки для типа объекта
  const getTypeIcon = (type: string) => {
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Объекты квалификации</h2>
          <p className="text-sm text-gray-600 mt-1">
            Контрагент: <span className="font-medium">{contractorName}</span>
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить объект</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Загрузка объектов...</p>
        </div>
      )}

      {/* Objects List */}
      {!loading && objects.length === 0 && (
        <div className="text-center py-8">
          <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Объекты квалификации не найдены</p>
          <p className="text-sm text-gray-500 mt-1">Добавьте первый объект для начала работы</p>
        </div>
      )}

      {!loading && objects.length > 0 && (
        <div className="space-y-4">
          {objects.map((object) => (
            <div key={object.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="text-indigo-600 mt-1">
                    {getTypeIcon(object.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-900">
                        {object.name || QualificationObjectTypeLabels[object.type]}
                      </h3>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                        {QualificationObjectTypeLabels[object.type]}
                      </span>
                    </div>
                    
                    {object.address && (
                      <div className="flex items-center space-x-1 mt-1">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{object.address}</span>
                      </div>
                    )}

                    {/* Дополнительная информация в зависимости от типа */}
                    <div className="mt-2 space-y-1">
                      {object.area && (
                        <p className="text-sm text-gray-600">
                          Площадь: <span className="font-medium">{object.area} м²</span>
                        </p>
                      )}
                      {object.vin && (
                        <p className="text-sm text-gray-600">
                          VIN: <span className="font-medium">{object.vin}</span>
                        </p>
                      )}
                      {object.registrationNumber && (
                        <p className="text-sm text-gray-600">
                          Гос. номер: <span className="font-medium">{object.registrationNumber}</span>
                        </p>
                      )}
                      {object.bodyVolume && (
                        <p className="text-sm text-gray-600">
                          Объем кузова: <span className="font-medium">{object.bodyVolume} м³</span>
                        </p>
                      )}
                      {object.inventoryNumber && (
                        <p className="text-sm text-gray-600">
                          Инвентарный номер: <span className="font-medium">{object.inventoryNumber}</span>
                        </p>
                      )}
                      {object.chamberVolume && (
                        <p className="text-sm text-gray-600">
                          Объем камеры: <span className="font-medium">{object.chamberVolume} л</span>
                        </p>
                      )}
                      {object.serialNumber && (
                        <p className="text-sm text-gray-600">
                          Серийный номер: <span className="font-medium">{object.serialNumber}</span>
                        </p>
                      )}
                      {object.climateSystem && (
                        <p className="text-sm text-gray-600">
                          Климатическая система: <span className="font-medium">{object.climateSystem}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setEditingObject(object)}
                    className="text-gray-600 hover:text-indigo-600 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(object.id)}
                    className="text-gray-600 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Добавить объект квалификации</h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <QualificationObjectForm
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {/* Edit Form Modal */}
      {editingObject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Редактировать объект квалификации</h3>
              <button
                onClick={() => setEditingObject(null)}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <QualificationObjectForm
              initialData={editingObject}
              onSubmit={(data) => handleUpdate(editingObject.id, data)}
              onCancel={() => setEditingObject(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};