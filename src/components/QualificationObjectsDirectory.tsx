import React, { useState, useEffect } from 'react';
import { Building, Search, Plus, Edit2, Trash2, Save, X, MapPin, FileImage, Car, Refrigerator, Snowflake } from 'lucide-react';
import { QualificationObject, QualificationObjectTypeLabels, CreateQualificationObjectData, UpdateQualificationObjectData } from '../types/QualificationObject';
import { Contractor } from '../types/Contractor';
import { qualificationObjectService } from '../utils/qualificationObjectService';
import { contractorService } from '../utils/contractorService';
import { QualificationObjectForm } from './QualificationObjectForm';

export const QualificationObjectsDirectory: React.FC = () => {
  const [qualificationObjects, setQualificationObjects] = useState<QualificationObject[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [filteredObjects, setFilteredObjects] = useState<QualificationObject[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  
  // UI state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingObject, setEditingObject] = useState<string | null>(null);
  const [editObjectData, setEditObjectData] = useState<UpdateQualificationObjectData>({});
  const [selectedContractor, setSelectedContractor] = useState<string>('');

  // Загрузка данных
  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Загружаем все объекты квалификации
      if (qualificationObjectService.isAvailable()) {
        try {
          const objectsData = await qualificationObjectService.getAllQualificationObjects();
          setQualificationObjects(objectsData);
          setFilteredObjects(objectsData);
        } catch (error) {
          console.error('Ошибка загрузки объектов квалификации:', error);
          setQualificationObjects([]);
          setFilteredObjects([]);
        }
      } else {
        console.warn('Сервис объектов квалификации недоступен');
        setQualificationObjects([]);
        setFilteredObjects([]);
      }

      // Загружаем контрагентов
      if (contractorService.isAvailable()) {
        try {
          const contractorsData = await contractorService.getAllContractors();
          setContractors(contractorsData);
        } catch (error) {
          console.error('Ошибка загрузки контрагентов:', error);
          setContractors([]);
        }
      } else {
        console.warn('Сервис контрагентов недоступен');
        setContractors([]);
      }

      // Проверяем, есть ли проблемы с подключением к Supabase
      if (!qualificationObjectService.isAvailable() || !contractorService.isAvailable()) {
        setError('Подключение к базе данных недоступно. Проверьте настройки Supabase.');
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      setError('Ошибка подключения к базе данных. Проверьте настройки Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Поиск по объектам квалификации
  useEffect(() => {
    if (!searchTerm.trim() && !selectedContractor) {
      setFilteredObjects(qualificationObjects);
      return;
    }

    let filtered = qualificationObjects;

    // Фильтрация по контрагенту
    if (selectedContractor) {
      filtered = filtered.filter(obj => obj.contractorId === selectedContractor);
    }

    // Фильтрация по поисковому запросу
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(obj => {
        return (
          QualificationObjectTypeLabels[obj.type].toLowerCase().includes(searchLower) ||
          (obj.name && obj.name.toLowerCase().includes(searchLower)) ||
          (obj.address && obj.address.toLowerCase().includes(searchLower)) ||
          (obj.vin && obj.vin.toLowerCase().includes(searchLower)) ||
          (obj.serialNumber && obj.serialNumber.toLowerCase().includes(searchLower)) ||
          (obj.inventoryNumber && obj.inventoryNumber.toLowerCase().includes(searchLower)) ||
          (obj.registrationNumber && obj.registrationNumber.toLowerCase().includes(searchLower)) ||
          (obj.climateSystem && obj.climateSystem.toLowerCase().includes(searchLower))
        );
      });
    }

    setFilteredObjects(filtered);
  }, [searchTerm, selectedContractor, qualificationObjects]);

  // Получение названия контрагента
  const getContractorName = (contractorId: string) => {
    const contractor = contractors.find(c => c.id === contractorId);
    return contractor ? contractor.name : 'Неизвестный контрагент';
  };

  // Получение иконки типа объекта
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

  // Добавление объекта квалификации
  const handleAddObject = async (objectData: CreateQualificationObjectData) => {
    setOperationLoading(true);
    try {
      const addedObject = await qualificationObjectService.addQualificationObject(objectData);
      setQualificationObjects(prev => [addedObject, ...prev]);
      setShowAddForm(false);
      alert('Объект квалификации успешно добавлен');
    } catch (error) {
      console.error('Ошибка добавления объекта квалификации:', error);
      alert(`Ошибка добавления объекта квалификации: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Начало редактирования объекта
  const handleEditObject = (obj: QualificationObject) => {
    setEditObjectData({
      name: obj.name,
      address: obj.address,
      area: obj.area,
      climateSystem: obj.climateSystem,
      vin: obj.vin,
      registrationNumber: obj.registrationNumber,
      bodyVolume: obj.bodyVolume,
      inventoryNumber: obj.inventoryNumber,
      chamberVolume: obj.chamberVolume,
      serialNumber: obj.serialNumber
    });
    setEditingObject(obj.id);
  };

  // Сохранение изменений объекта
  const handleSaveObject = async () => {
    if (!editingObject) return;

    setOperationLoading(true);
    try {
      const updatedObject = await qualificationObjectService.updateQualificationObject(
        editingObject,
        editObjectData
      );
      
      setQualificationObjects(prev => 
        prev.map(obj => obj.id === editingObject ? updatedObject : obj)
      );
      
      setEditingObject(null);
      setEditObjectData({});
      alert('Объект квалификации успешно обновлен');
    } catch (error) {
      console.error('Ошибка обновления объекта квалификации:', error);
      alert(`Ошибка обновления: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Отмена редактирования
  const handleCancelEdit = () => {
    setEditingObject(null);
    setEditObjectData({});
  };

  // Удаление объекта квалификации
  const handleDeleteObject = async (objectId: string) => {
    if (confirm('Вы уверены, что хотите удалить этот объект квалификации?')) {
      setOperationLoading(true);
      try {
        await qualificationObjectService.deleteQualificationObject(objectId);
        setQualificationObjects(prev => prev.filter(obj => obj.id !== objectId));
        alert('Объект квалификации успешно удален');
      } catch (error) {
        console.error('Ошибка удаления объекта квалификации:', error);
        alert(`Ошибка удаления объекта квалификации: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      } finally {
        setOperationLoading(false);
      }
    }
  };

  // Рендер деталей объекта
  const renderObjectDetails = (obj: QualificationObject) => {
    if (editingObject === obj.id) {
      // Режим редактирования
      return (
        <div className="space-y-3">
          {/* Поля в зависимости от типа объекта */}
          {(obj.type === 'помещение' || obj.type === 'холодильная_камера') && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Наименование</label>
              <input
                type="text"
                value={editObjectData.name || ''}
                onChange={(e) => setEditObjectData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          )}

          {obj.type === 'помещение' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Адрес</label>
                <input
                  type="text"
                  value={editObjectData.address || ''}
                  onChange={(e) => setEditObjectData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Площадь (м²)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editObjectData.area || ''}
                  onChange={(e) => setEditObjectData(prev => ({ ...prev, area: parseFloat(e.target.value) || undefined }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </>
          )}

          {obj.type === 'автомобиль' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">VIN номер</label>
                <input
                  type="text"
                  value={editObjectData.vin || ''}
                  onChange={(e) => setEditObjectData(prev => ({ ...prev, vin: e.target.value }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Рег. номер</label>
                <input
                  type="text"
                  value={editObjectData.registrationNumber || ''}
                  onChange={(e) => setEditObjectData(prev => ({ ...prev, registrationNumber: e.target.value }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Объем кузова (м³)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editObjectData.bodyVolume || ''}
                  onChange={(e) => setEditObjectData(prev => ({ ...prev, bodyVolume: parseFloat(e.target.value) || undefined }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </>
          )}

          {obj.type === 'холодильная_камера' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Инв. номер</label>
                <input
                  type="text"
                  value={editObjectData.inventoryNumber || ''}
                  onChange={(e) => setEditObjectData(prev => ({ ...prev, inventoryNumber: e.target.value }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Объем камеры (м³)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editObjectData.chamberVolume || ''}
                  onChange={(e) => setEditObjectData(prev => ({ ...prev, chamberVolume: parseFloat(e.target.value) || undefined }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </>
          )}

          {(obj.type === 'холодильник' || obj.type === 'морозильник') && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Серийный номер</label>
                <input
                  type="text"
                  value={editObjectData.serialNumber || ''}
                  onChange={(e) => setEditObjectData(prev => ({ ...prev, serialNumber: e.target.value }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Инв. номер</label>
                <input
                  type="text"
                  value={editObjectData.inventoryNumber || ''}
                  onChange={(e) => setEditObjectData(prev => ({ ...prev, inventoryNumber: e.target.value }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </>
          )}

          {/* Климатическая установка для всех типов кроме холодильника и морозильника */}
          {!['холодильник', 'морозильник'].includes(obj.type) && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Климатическая установка</label>
              <input
                type="text"
                value={editObjectData.climateSystem || ''}
                onChange={(e) => setEditObjectData(prev => ({ ...prev, climateSystem: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          )}
        </div>
      );
    }

    // Режим просмотра
    return (
      <div className="space-y-2">
        {obj.name && (
          <div className="text-sm">
            <span className="font-medium text-gray-700">Наименование:</span>
            <span className="ml-2 text-gray-900">{obj.name}</span>
          </div>
        )}
        {obj.address && (
          <div className="text-sm">
            <span className="font-medium text-gray-700">Адрес:</span>
            <span className="ml-2 text-gray-900">{obj.address}</span>
          </div>
        )}
        {obj.area && (
          <div className="text-sm">
            <span className="font-medium text-gray-700">Площадь:</span>
            <span className="ml-2 text-gray-900">{obj.area} м²</span>
          </div>
        )}
        {obj.climateSystem && (
          <div className="text-sm">
            <span className="font-medium text-gray-700">Климатическая установка:</span>
            <span className="ml-2 text-gray-900">{obj.climateSystem}</span>
          </div>
        )}
        {obj.vin && (
          <div className="text-sm">
            <span className="font-medium text-gray-700">VIN:</span>
            <span className="ml-2 text-gray-900">{obj.vin}</span>
          </div>
        )}
        {obj.registrationNumber && (
          <div className="text-sm">
            <span className="font-medium text-gray-700">Рег. номер:</span>
            <span className="ml-2 text-gray-900">{obj.registrationNumber}</span>
          </div>
        )}
        {obj.bodyVolume && (
          <div className="text-sm">
            <span className="font-medium text-gray-700">Объем кузова:</span>
            <span className="ml-2 text-gray-900">{obj.bodyVolume} м³</span>
          </div>
        )}
        {obj.inventoryNumber && (
          <div className="text-sm">
            <span className="font-medium text-gray-700">Инв. номер:</span>
            <span className="ml-2 text-gray-900">{obj.inventoryNumber}</span>
          </div>
        )}
        {obj.chamberVolume && (
          <div className="text-sm">
            <span className="font-medium text-gray-700">Объем камеры:</span>
            <span className="ml-2 text-gray-900">{obj.chamberVolume} м³</span>
          </div>
        )}
        {obj.serialNumber && (
          <div className="text-sm">
            <span className="font-medium text-gray-700">Серийный номер:</span>
            <span className="ml-2 text-gray-900">{obj.serialNumber}</span>
          </div>
        )}
      </div>
    );
  };

  // Получение статистики по типам объектов
  const getTypeStatistics = () => {
    const stats = qualificationObjects.reduce((acc, obj) => {
      acc[obj.type] = (acc[obj.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(stats).map(([type, count]) => ({
      type,
      label: QualificationObjectTypeLabels[type as keyof typeof QualificationObjectTypeLabels],
      count
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Building className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Справочник объектов квалификации</h1>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить объект</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
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

          {/* Contractor Filter */}
          <div>
            <select
              value={selectedContractor}
              onChange={(e) => setSelectedContractor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Все контрагенты</option>
              {contractors.map((contractor) => (
                <option key={contractor.id} value={contractor.id}>
                  {contractor.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(searchTerm || selectedContractor) && (
          <div className="mt-2 text-sm text-gray-600">
            Найдено: {filteredObjects.length} из {qualificationObjects.length} объектов
          </div>
        )}
      </div>

      {/* Add Object Form */}
      {showAddForm && (
        <QualificationObjectForm
          contractorId={selectedContractor || contractors[0]?.id || ''}
          onAdd={handleAddObject}
          onCancel={() => setShowAddForm(false)}
          loading={operationLoading}
        />
      )}

      {/* Objects Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {error && (
          <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400">
            <div className="flex">
              <div className="w-5 h-5 text-yellow-400 mr-2">⚠️</div>
              <div>
                <p className="text-sm text-yellow-700">{error}</p>
                <p className="text-xs text-yellow-600 mt-1">
                  Убедитесь, что переменные VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY настроены в файле .env
                </p>
              </div>
            </div>
          </div>
        )}

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
                    Контрагент
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getContractorName(obj.contractorId)}
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
                          <div className="text-green-600" title="Геокодирован">
                            <MapPin className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {editingObject === obj.id ? (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={handleSaveObject}
                            disabled={operationLoading}
                            className="text-green-600 hover:text-green-800 transition-colors"
                            title="Сохранить изменения"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-gray-600 hover:text-gray-800 transition-colors"
                            title="Отменить изменения"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEditObject(obj)}
                            disabled={operationLoading}
                            className="text-indigo-600 hover:text-indigo-800 transition-colors"
                            title="Редактировать"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteObject(obj.id)}
                            disabled={operationLoading}
                            className="text-red-600 hover:text-red-800 transition-colors"
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
            {searchTerm || selectedContractor ? (
              <>
                <p>По заданным критериям ничего не найдено</p>
                <p className="text-sm">Попробуйте изменить фильтры или поисковый запрос</p>
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

      {/* Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Статистика по типам объектов</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {getTypeStatistics().map(({ type, label, count }) => (
            <div key={type} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-center mb-2">
                {getTypeIcon(type)}
              </div>
              <div className="text-2xl font-bold text-indigo-600">{count}</div>
              <div className="text-sm text-gray-500">{label}</div>
            </div>
          ))}
          <div className="text-center p-4 bg-indigo-50 rounded-lg">
            <div className="text-2xl font-bold text-indigo-600">{qualificationObjects.length}</div>
            <div className="text-sm text-gray-500">Всего объектов</div>
          </div>
        </div>
      </div>
    </div>
  );
};