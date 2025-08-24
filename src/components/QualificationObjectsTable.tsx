import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Save, X, MapPin, FileImage, Building, Car, Refrigerator, Snowflake } from 'lucide-react';
import { QualificationObject, QualificationObjectTypeLabels } from '../types/QualificationObject';

interface QualificationObjectsTableProps {
  objects: QualificationObject[];
  onAdd: () => void;
  onEdit: (objectId: string, updates: any) => void;
  onDelete: (objectId: string) => void;
  onShowOnMap: (object: QualificationObject) => void;
  loading?: boolean;
}

export const QualificationObjectsTable: React.FC<QualificationObjectsTableProps> = ({
  objects,
  onAdd,
  onEdit,
  onDelete,
  onShowOnMap,
  loading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredObjects, setFilteredObjects] = useState<QualificationObject[]>(objects);
  const [editingObject, setEditingObject] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

  // Поиск по объектам квалификации
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredObjects(objects);
      return;
    }

    const filtered = objects.filter(obj => {
      const searchLower = searchTerm.toLowerCase();
      
      // Поиск по типу
      if (QualificationObjectTypeLabels[obj.type].toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Поиск по наименованию
      if (obj.name && obj.name.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Поиск по адресу
      if (obj.address && obj.address.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Поиск по климатической установке
      if (obj.climateSystem && obj.climateSystem.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Поиск по VIN
      if (obj.vin && obj.vin.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Поиск по регистрационному номеру
      if (obj.registrationNumber && obj.registrationNumber.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Поиск по инвентарному номеру
      if (obj.inventoryNumber && obj.inventoryNumber.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Поиск по серийному номеру
      if (obj.serialNumber && obj.serialNumber.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      return false;
    });

    setFilteredObjects(filtered);
  }, [searchTerm, objects]);

  // Начать редактирование
  const handleStartEdit = (obj: QualificationObject) => {
    setEditData({
      name: obj.name || '',
      address: obj.address || '',
      area: obj.area || '',
      climateSystem: obj.climateSystem || '',
      vin: obj.vin || '',
      registrationNumber: obj.registrationNumber || '',
      bodyVolume: obj.bodyVolume || '',
      inventoryNumber: obj.inventoryNumber || '',
      chamberVolume: obj.chamberVolume || '',
      serialNumber: obj.serialNumber || ''
    });
    setEditingObject(obj.id);
  };

  // Сохранить изменения
  const handleSaveEdit = (objectId: string) => {
    // Очищаем пустые значения
    const cleanedData: any = {};
    Object.keys(editData).forEach(key => {
      const value = editData[key];
      if (value !== '' && value !== null && value !== undefined) {
        if (key === 'area' || key === 'bodyVolume' || key === 'chamberVolume') {
          cleanedData[key] = parseFloat(value) || undefined;
        } else {
          cleanedData[key] = value;
        }
      }
    });
    
    onEdit(objectId, cleanedData);
    setEditingObject(null);
    setEditData({});
  };

  // Отменить редактирование
  const handleCancelEdit = () => {
    setEditingObject(null);
    setEditData({});
  };

  // Рендер полей редактирования в зависимости от типа объекта
  const renderEditFields = (obj: QualificationObject) => {
    switch (obj.type) {
      case 'помещение':
        return (
          <div className="space-y-2">
            <input
              type="text"
              value={editData.name || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="Наименование"
            />
            <input
              type="text"
              value={editData.address || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, address: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="Адрес"
            />
            <input
              type="number"
              step="0.01"
              value={editData.area || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, area: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="Площадь (м²)"
            />
            <input
              type="text"
              value={editData.climateSystem || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, climateSystem: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="Климатическая установка"
            />
          </div>
        );
      case 'автомобиль':
        return (
          <div className="space-y-2">
            <input
              type="text"
              value={editData.vin || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, vin: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="VIN номер"
            />
            <input
              type="text"
              value={editData.registrationNumber || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, registrationNumber: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="Регистрационный номер"
            />
            <input
              type="number"
              step="0.01"
              value={editData.bodyVolume || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, bodyVolume: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="Объем кузова (м³)"
            />
            <input
              type="text"
              value={editData.climateSystem || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, climateSystem: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="Климатическая установка"
            />
          </div>
        );
      case 'холодильная_камера':
        return (
          <div className="space-y-2">
            <input
              type="text"
              value={editData.name || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="Наименование"
            />
            <input
              type="text"
              value={editData.inventoryNumber || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, inventoryNumber: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="Инвентарный номер"
            />
            <input
              type="number"
              step="0.01"
              value={editData.chamberVolume || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, chamberVolume: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="Объем камеры (м³)"
            />
            <input
              type="text"
              value={editData.climateSystem || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, climateSystem: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="Климатическая установка"
            />
          </div>
        );
      case 'холодильник':
      case 'морозильник':
        return (
          <div className="space-y-2">
            <input
              type="text"
              value={editData.serialNumber || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, serialNumber: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="Серийный номер"
            />
            <input
              type="text"
              value={editData.inventoryNumber || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, inventoryNumber: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="Инвентарный номер"
            />
          </div>
        );
      default:
        return null;
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
    <div className="space-y-4">
      {/* Header with search and add button */}
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
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
        <button
          onClick={onAdd}
          className="ml-4 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить объект</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
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
                      {editingObject === obj.id ? renderEditFields(obj) : renderObjectDetails(obj)}
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
                            onClick={() => onShowOnMap(obj)}
                            className="text-green-600 hover:text-green-800"
                            title="Показать на карте"
                          >
                            <MapPin className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {editingObject === obj.id ? (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleSaveEdit(obj.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Сохранить"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-gray-600 hover:text-gray-900"
                            title="Отмена"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleStartEdit(obj)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Редактировать"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDelete(obj.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
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
      </div>
    </div>
  );
};