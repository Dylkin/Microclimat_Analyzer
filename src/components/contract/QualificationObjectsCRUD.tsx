import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Building, Car, Refrigerator, Snowflake, MapPin, FileImage, Search } from 'lucide-react';
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
  const [filteredObjects, setFilteredObjects] = useState<QualificationObject[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingObject, setEditingObject] = useState<QualificationObject | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Загрузка объектов квалификации
  const loadObjects = async () => {
    if (!qualificationObjectService.isAvailable()) {
      setError('Supabase не настроен для работы с объектами квалификации');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await qualificationObjectService.getQualificationObjects(contractorId);
      setObjects(data);
      setFilteredObjects(data);
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

  // Поиск по объектам
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredObjects(objects);
      return;
    }

    const filtered = objects.filter(obj => {
      const searchLower = searchTerm.toLowerCase();
      return (
        (obj.name && obj.name.toLowerCase().includes(searchLower)) ||
        (obj.address && obj.address.toLowerCase().includes(searchLower)) ||
        (obj.vin && obj.vin.toLowerCase().includes(searchLower)) ||
        (obj.serialNumber && obj.serialNumber.toLowerCase().includes(searchLower)) ||
        (obj.inventoryNumber && obj.inventoryNumber.toLowerCase().includes(searchLower)) ||
        (obj.registrationNumber && obj.registrationNumber.toLowerCase().includes(searchLower)) ||
        obj.type.toLowerCase().includes(searchLower)
      );
    });

    setFilteredObjects(filtered);
  }, [searchTerm, objects]);

  // Добавление объекта
  const handleAddObject = async (objectData: CreateQualificationObjectData) => {
    setOperationLoading(true);
    try {
      const addedObject = await qualificationObjectService.addQualificationObject(objectData);
      setObjects(prev => [...prev, addedObject]);
      setShowAddForm(false);
      setEditingObject(null);
    } catch (error) {
      console.error('Ошибка добавления объекта квалификации:', error);
      alert(`Ошибка добавления объекта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Редактирование объекта
  const handleEditObject = (obj: QualificationObject) => {
    setEditingObject(obj);
    setShowAddForm(true);
  };

  // Сохранение изменений объекта
  const handleSaveObject = async (objectData: CreateQualificationObjectData) => {
    setOperationLoading(true);
    try {
      if (editingObject) {
        const updatedObject = await qualificationObjectService.updateQualificationObject(
          editingObject.id,
          objectData
        );
        setObjects(prev => prev.map(obj => 
          obj.id === editingObject.id ? updatedObject : obj
        ));
      } else {
        await handleAddObject(objectData);
        return;
      }
      
      setShowAddForm(false);
      setEditingObject(null);
    } catch (error) {
      console.error('Ошибка сохранения объекта квалификации:', error);
      alert(`Ошибка сохранения объекта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Удаление объекта
  const handleDeleteObject = async (objectId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот объект квалификации?')) {
      return;
    }

    setOperationLoading(true);
    try {
      await qualificationObjectService.deleteQualificationObject(objectId);
      setObjects(prev => prev.filter(obj => obj.id !== objectId));
    } catch (error) {
      console.error('Ошибка удаления объекта квалификации:', error);
      alert(`Ошибка удаления объекта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'помещение':
        return <Building className="w-4 h-4 text-blue-600" />;
      case 'автомобиль':
        return <Car className="w-4 h-4 text-green-600" />;
      case 'холодильная_камера':
        return <Refrigerator className="w-4 h-4 text-cyan-600" />;
      case 'холодильник':
        return <Refrigerator className="w-4 h-4 text-blue-500" />;
      case 'морозильник':
        return <Snowflake className="w-4 h-4 text-indigo-600" />;
      default:
        return <Building className="w-4 h-4 text-gray-600" />;
    }
  };

  const renderObjectDetails = (obj: QualificationObject) => {
    switch (obj.type) {
      case 'помещение':
        return (
          <div className="text-sm text-gray-600">
            {obj.address && <div>📍 {obj.address}</div>}
            {obj.area && <div>📐 {obj.area} м²</div>}
            {obj.climateSystem && <div>❄️ {obj.climateSystem}</div>}
          </div>
        );
      case 'автомобиль':
        return (
          <div className="text-sm text-gray-600">
            {obj.vin && <div>🔢 VIN: {obj.vin}</div>}
            {obj.registrationNumber && <div>🚗 {obj.registrationNumber}</div>}
            {obj.bodyVolume && <div>📦 {obj.bodyVolume} м³</div>}
            {obj.climateSystem && <div>❄️ {obj.climateSystem}</div>}
          </div>
        );
      case 'холодильная_камера':
        return (
          <div className="text-sm text-gray-600">
            {obj.inventoryNumber && <div>📋 Инв. №: {obj.inventoryNumber}</div>}
            {obj.chamberVolume && <div>📦 {obj.chamberVolume} м³</div>}
            {obj.climateSystem && <div>❄️ {obj.climateSystem}</div>}
          </div>
        );
      case 'холодильник':
      case 'морозильник':
        return (
          <div className="text-sm text-gray-600">
            {obj.serialNumber && <div>🔢 S/N: {obj.serialNumber}</div>}
            {obj.inventoryNumber && <div>📋 Инв. №: {obj.inventoryNumber}</div>}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Объекты квалификации</h3>
          <p className="text-sm text-gray-600">Контрагент: {contractorName}</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          disabled={operationLoading}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить объект</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="mb-6">
          <QualificationObjectForm
            contractorId={contractorId}
            onAdd={handleSaveObject}
            onCancel={() => {
              setShowAddForm(false);
              setEditingObject(null);
            }}
            loading={operationLoading}
            editingObject={editingObject}
          />
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Поиск по объектам квалификации..."
          />
        </div>
        {searchTerm && (
          <div className="mt-2 text-sm text-gray-600">
            Найдено: {filteredObjects.length} из {objects.length} объектов
          </div>
        )}
      </div>

      {/* Objects Table */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Загрузка объектов квалификации...</p>
        </div>
      ) : filteredObjects.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Тип
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Наименование
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Детали
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Файлы
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredObjects.map((obj) => (
                <tr key={obj.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(obj.type)}
                      <span className="text-sm font-medium text-gray-900">
                        {QualificationObjectTypeLabels[obj.type]}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {obj.name || obj.vin || obj.serialNumber || 'Без названия'}
                    </div>
                    <div className="text-xs text-gray-500">
                      Создан: {obj.createdAt.toLocaleDateString('ru-RU')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {renderObjectDetails(obj)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {obj.planFileUrl && (
                        <a
                          href={obj.planFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                          title={`Открыть план: ${obj.planFileName}`}
                        >
                          <FileImage className="w-4 h-4" />
                        </a>
                      )}
                      {obj.latitude && obj.longitude && (
                        <button
                          className="text-green-600 hover:text-green-800"
                          title="Показать на карте"
                        >
                          <MapPin className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEditObject(obj)}
                        disabled={operationLoading}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Редактировать"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteObject(obj.id)}
                        disabled={operationLoading}
                        className="text-red-600 hover:text-red-900"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Building className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          {searchTerm ? (
            <>
              <p>По запросу "{searchTerm}" ничего не найдено</p>
              <p className="text-sm">Попробуйте изменить поисковый запрос</p>
            </>
          ) : (
            <>
              <p>Объекты квалификации не найдены</p>
              <p className="text-sm">Нажмите кнопку "Добавить объект" для создания первой записи</p>
            </>
          )}
        </div>
      )}

      {/* Statistics */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Статистика объектов:</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-indigo-600">{objects.length}</div>
            <div className="text-xs text-gray-500">Всего</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-600">
              {objects.filter(obj => obj.type === 'помещение').length}
            </div>
            <div className="text-xs text-gray-500">Помещений</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-600">
              {objects.filter(obj => obj.type === 'автомобиль').length}
            </div>
            <div className="text-xs text-gray-500">Автомобилей</div>
          </div>
          <div>
            <div className="text-lg font-bold text-cyan-600">
              {objects.filter(obj => obj.type === 'холодильная_камера').length}
            </div>
            <div className="text-xs text-gray-500">Камер</div>
          </div>
          <div>
            <div className="text-lg font-bold text-purple-600">
              {objects.filter(obj => ['холодильник', 'морозильник'].includes(obj.type)).length}
            </div>
            <div className="text-xs text-gray-500">Холод. оборуд.</div>
          </div>
        </div>
      </div>
    </div>
  );
};