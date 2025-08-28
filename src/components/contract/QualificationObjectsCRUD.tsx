import React, { useState, useEffect } from 'react';
import { Plus, Search, Building, Car, Refrigerator, Snowflake, MapPin, FileText, Eye, Edit2, Trash2 } from 'lucide-react';
import { QualificationObject, QualificationObjectType, QualificationObjectTypeLabels } from '../../types/QualificationObject';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<QualificationObjectType | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [editingObject, setEditingObject] = useState<QualificationObject | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  // Загрузка объектов квалификации
  const loadObjects = async () => {
    if (!qualificationObjectService.isAvailable()) {
      setError('Supabase не настроен');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await qualificationObjectService.getByContractorId(contractorId);
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

  // Фильтрация объектов
  const filteredObjects = objects.filter(obj => {
    const matchesSearch = !searchTerm || 
      obj.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obj.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obj.vin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obj.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obj.registrationNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !selectedType || obj.type === selectedType;
    
    return matchesSearch && matchesType;
  });

  // Статистика по типам
  const typeStats = objects.reduce((acc, obj) => {
    acc[obj.type] = (acc[obj.type] || 0) + 1;
    return acc;
  }, {} as Record<QualificationObjectType, number>);

  // Обработка создания объекта
  const handleCreate = async (objectData: any) => {
    try {
      await qualificationObjectService.create({
        ...objectData,
        contractorId
      });
      await loadObjects();
      setShowForm(false);
      alert('Объект квалификации успешно создан');
    } catch (error) {
      console.error('Ошибка создания объекта:', error);
      alert(`Ошибка создания объекта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  // Обработка обновления объекта
  const handleUpdate = async (objectData: any) => {
    if (!editingObject) return;

    try {
      await qualificationObjectService.update(editingObject.id, objectData);
      await loadObjects();
      setEditingObject(null);
      setShowForm(false);
      alert('Объект квалификации успешно обновлен');
    } catch (error) {
      console.error('Ошибка обновления объекта:', error);
      alert(`Ошибка обновления объекта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  // Обработка удаления объекта
  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот объект квалификации?')) {
      return;
    }

    try {
      await qualificationObjectService.delete(id);
      await loadObjects();
      alert('Объект квалификации успешно удален');
    } catch (error) {
      console.error('Ошибка удаления объекта:', error);
      alert(`Ошибка удаления объекта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  // Получение иконки для типа объекта
  const getTypeIcon = (type: QualificationObjectType) => {
    switch (type) {
      case 'помещение':
        return <Building className="w-4 h-4" />;
      case 'автомобиль':
        return <Car className="w-4 h-4" />;
      case 'холодильная_камера':
        return <Refrigerator className="w-4 h-4" />;
      case 'холодильник':
        return <Snowflake className="w-4 h-4" />;
      case 'морозильник':
        return <Snowflake className="w-4 h-4" />;
      default:
        return <Building className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Заголовок с возможностью сворачивания */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2 text-left"
        >
          <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
            ▶
          </span>
          <h4 className="font-medium text-gray-900">
            Объекты квалификации ({objects.length})
          </h4>
        </button>
        
        {isExpanded && (
          <button
            onClick={() => {
              setEditingObject(null);
              setShowForm(true);
            }}
            className="bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700 transition-colors flex items-center space-x-1 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить</span>
          </button>
        )}
      </div>

      {isExpanded && (
        <>
          {/* Статистика по типам */}
          {Object.keys(typeStats).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(typeStats).map(([type, count]) => (
                <div
                  key={type}
                  className="flex items-center space-x-1 bg-gray-100 px-2 py-1 rounded-md text-xs"
                >
                  {getTypeIcon(type as QualificationObjectType)}
                  <span>{QualificationObjectTypeLabels[type as QualificationObjectType]}: {count}</span>
                </div>
              ))}
            </div>
          )}

          {/* Поиск и фильтры */}
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по названию, адресу, VIN, серийному номеру..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as QualificationObjectType | '')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            >
              <option value="">Все типы</option>
              {Object.entries(QualificationObjectTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Форма создания/редактирования */}
          {showForm && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <h5 className="font-medium text-gray-900">
                  {editingObject ? 'Редактировать объект' : 'Добавить новый объект'}
                </h5>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingObject(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <QualificationObjectForm
                initialData={editingObject}
                onSubmit={editingObject ? handleUpdate : handleCreate}
                onCancel={() => {
                  setShowForm(false);
                  setEditingObject(null);
                }}
              />
            </div>
          )}

          {/* Ошибки */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Загрузка */}
          {loading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Загрузка объектов...</p>
            </div>
          )}

          {/* Таблица объектов */}
          {!loading && filteredObjects.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Тип
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Название
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Адрес
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Характеристики
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Файлы
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredObjects.map((obj) => (
                    <tr key={obj.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(obj.type)}
                          <span className="text-sm text-gray-900">
                            {QualificationObjectTypeLabels[obj.type]}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-sm text-gray-900">{obj.name || 'Не указано'}</div>
                        {obj.climateSystem && (
                          <div className="text-xs text-gray-500">{obj.climateSystem}</div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-sm text-gray-900">{obj.address || 'Не указан'}</div>
                        {obj.latitude && obj.longitude && (
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <MapPin className="w-3 h-3" />
                            <span>{obj.latitude.toFixed(6)}, {obj.longitude.toFixed(6)}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-xs text-gray-600 space-y-1">
                          {obj.area && <div>Площадь: {obj.area} м²</div>}
                          {obj.vin && <div>VIN: {obj.vin}</div>}
                          {obj.registrationNumber && <div>Гос. номер: {obj.registrationNumber}</div>}
                          {obj.bodyVolume && <div>Объем кузова: {obj.bodyVolume} м³</div>}
                          {obj.inventoryNumber && <div>Инв. номер: {obj.inventoryNumber}</div>}
                          {obj.chamberVolume && <div>Объем камеры: {obj.chamberVolume} л</div>}
                          {obj.serialNumber && <div>Серийный номер: {obj.serialNumber}</div>}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex space-x-2">
                          {obj.planFileUrl && (
                            <button
                              onClick={() => window.open(obj.planFileUrl, '_blank')}
                              className="text-blue-600 hover:text-blue-800"
                              title="Просмотреть план"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}
                          {obj.testDataFileUrl && (
                            <button
                              onClick={() => window.open(obj.testDataFileUrl, '_blank')}
                              className="text-green-600 hover:text-green-800"
                              title="Просмотреть данные испытаний"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setEditingObject(obj);
                              setShowForm(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-800"
                            title="Редактировать"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(obj.id)}
                            className="text-red-600 hover:text-red-800"
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
          )}

          {/* Пустое состояние */}
          {!loading && filteredObjects.length === 0 && (
            <div className="text-center py-8">
              <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm || selectedType 
                  ? 'Объекты не найдены по заданным критериям'
                  : 'У данного контрагента пока нет объектов квалификации'
                }
              </p>
              {!searchTerm && !selectedType && (
                <button
                  onClick={() => {
                    setEditingObject(null);
                    setShowForm(true);
                  }}
                  className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Добавить первый объект
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};