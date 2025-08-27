import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, Plus, Edit2, Trash2, Building, Car, Refrigerator, Snowflake, MapPin, FileImage, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Project } from '../../types/Project';
import { ProjectDocument } from '../../utils/projectDocumentService';
import { QualificationObject, QualificationObjectTypeLabels, CreateQualificationObjectData } from '../../types/QualificationObject';
import { qualificationObjectService } from '../../utils/qualificationObjectService';
import { QualificationObjectForm } from '../QualificationObjectForm';

interface NegotiationStagesProps {
  project: Project;
  commercialOfferDoc?: ProjectDocument;
  contractDoc?: ProjectDocument;
}

export const NegotiationStages: React.FC<NegotiationStagesProps> = ({
  project,
  commercialOfferDoc,
  contractDoc
}) => {
  const [objects, setObjects] = useState<QualificationObject[]>([]);
  const [filteredObjects, setFilteredObjects] = useState<QualificationObject[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingObject, setEditingObject] = useState<QualificationObject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showObjectsSection, setShowObjectsSection] = useState(true);

  // Загрузка объектов квалификации
  const loadObjects = async () => {
    if (!qualificationObjectService.isAvailable()) {
      setError('Supabase не настроен для работы с объектами квалификации');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await qualificationObjectService.getQualificationObjects(project.contractorId);
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
  }, [project.contractorId]);

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

  const getStatusIcon = (hasDocument: boolean) => {
    return hasDocument ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <Clock className="w-5 h-5 text-yellow-500" />
    );
  };

  const getPlannedDate = (daysFromCreation: number): string => {
    if (!project.createdAt) return 'Не определена';
    
    const plannedDate = new Date(project.createdAt);
    plannedDate.setDate(plannedDate.getDate() + daysFromCreation);
    return plannedDate.toLocaleDateString('ru-RU');
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Этапы согласования</h2>
      
      {/* Коммерческое предложение */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          {getStatusIcon(!!commercialOfferDoc)}
          <h3 className="text-lg font-semibold text-gray-900">Коммерческое предложение</h3>
        </div>
        
        <div className="space-y-4 ml-8">
          {/* Этап 1: Согласование объемов с CRUD объектов квалификации */}
          <div className="border-l-4 border-blue-500 pl-4 py-3 bg-blue-50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium text-gray-900">1. Согласование объемов</h4>
                <p className="text-sm text-gray-600">Ответственный: Менеджер</p>
                <p className="text-sm text-gray-500">Срок: 1 день с даты создания проекта</p>
                <p className="text-sm text-gray-500">
                  Плановая дата завершения: {getPlannedDate(1)}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowObjectsSection(!showObjectsSection)}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                  title={showObjectsSection ? 'Скрыть объекты' : 'Показать объекты'}
                >
                  {showObjectsSection ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                  В работе
                </span>
              </div>
            </div>

            {/* Объекты квалификации - CRUD функционал */}
            {showObjectsSection && (
              <div className="mt-4 bg-white rounded-lg border border-blue-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h5 className="text-md font-semibold text-gray-900">Объекты квалификации</h5>
                    <p className="text-sm text-gray-600">Контрагент: {project.contractorName}</p>
                  </div>
                  <button
                    onClick={() => setShowAddForm(true)}
                    disabled={operationLoading}
                    className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Добавить объект</span>
                  </button>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                {/* Add/Edit Form */}
                {showAddForm && (
                  <div className="mb-6">
                    <QualificationObjectForm
                      contractorId={project.contractorId}
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
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      placeholder="Поиск по объектам квалификации..."
                    />
                  </div>
                  {searchTerm && (
                    <div className="mt-2 text-xs text-gray-600">
                      Найдено: {filteredObjects.length} из {objects.length} объектов
                    </div>
                  )}
                </div>

                {/* Objects Table */}
                {loading ? (
                  <div className="text-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                    <p className="text-gray-500 text-sm">Загрузка объектов квалификации...</p>
                  </div>
                ) : filteredObjects.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Тип
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Наименование
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Детали
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Файлы
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Действия
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredObjects.map((obj) => (
                          <tr key={obj.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                {getTypeIcon(obj.type)}
                                <span className="text-sm font-medium text-gray-900">
                                  {QualificationObjectTypeLabels[obj.type]}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {obj.name || obj.vin || obj.serialNumber || 'Без названия'}
                              </div>
                              <div className="text-xs text-gray-500">
                                Создан: {obj.createdAt.toLocaleDateString('ru-RU')}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {renderObjectDetails(obj)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
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
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => handleEditObject(obj)}
                                  disabled={operationLoading}
                                  className="text-indigo-600 hover:text-indigo-900"
                                  title="Редактировать"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteObject(obj.id)}
                                  disabled={operationLoading}
                                  className="text-red-600 hover:text-red-900"
                                  title="Удалить"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <Building className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    {searchTerm ? (
                      <>
                        <p className="text-sm">По запросу "{searchTerm}" ничего не найдено</p>
                        <p className="text-xs">Попробуйте изменить поисковый запрос</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm">Объекты квалификации не найдены</p>
                        <p className="text-xs">Нажмите кнопку "Добавить объект" для создания первой записи</p>
                      </>
                    )}
                  </div>
                )}

                {/* Statistics */}
                {objects.length > 0 && (
                  <div className="mt-4 bg-gray-50 rounded-lg p-3">
                    <h6 className="text-xs font-medium text-gray-700 mb-2">Статистика объектов:</h6>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center">
                      <div>
                        <div className="text-sm font-bold text-indigo-600">{objects.length}</div>
                        <div className="text-xs text-gray-500">Всего</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-blue-600">
                          {objects.filter(obj => obj.type === 'помещение').length}
                        </div>
                        <div className="text-xs text-gray-500">Помещений</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-green-600">
                          {objects.filter(obj => obj.type === 'автомобиль').length}
                        </div>
                        <div className="text-xs text-gray-500">Автомобилей</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-cyan-600">
                          {objects.filter(obj => obj.type === 'холодильная_камера').length}
                        </div>
                        <div className="text-xs text-gray-500">Камер</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-purple-600">
                          {objects.filter(obj => ['холодильник', 'морозильник'].includes(obj.type)).length}
                        </div>
                        <div className="text-xs text-gray-500">Холод. оборуд.</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Этап 2: Формирование стоимости */}
          <div className="border-l-4 border-gray-300 pl-4 py-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">2. Формирование стоимости</h4>
                <p className="text-sm text-gray-600">Ответственный: Руководитель</p>
                <p className="text-sm text-gray-500">Срок: 1 день с даты завершения предыдущего этапа</p>
              </div>
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                Ожидает
              </span>
            </div>
          </div>

          {/* Этап 3: Рассмотрение заказчиком */}
          <div className="border-l-4 border-gray-300 pl-4 py-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">3. Рассмотрение заказчиком</h4>
                <p className="text-sm text-gray-600">Ответственный: Менеджер</p>
                <p className="text-sm text-gray-500">Срок: 2 дня с даты завершения предыдущего этапа</p>
              </div>
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                Ожидает
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Договор */}
      <div>
        <div className="flex items-center space-x-3 mb-4">
          {getStatusIcon(!!contractDoc)}
          <h3 className="text-lg font-semibold text-gray-900">Договор</h3>
          {!commercialOfferDoc && (
            <span className="text-sm text-gray-500">(доступен после принятия коммерческого предложения)</span>
          )}
        </div>
        
        <div className={`space-y-4 ml-8 ${!commercialOfferDoc ? 'opacity-50' : ''}`}>
          {/* Этап 4: Подготовка договора */}
          <div className={`border-l-4 pl-4 py-3 ${commercialOfferDoc ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">4. Подготовка договора</h4>
                <p className="text-sm text-gray-600">Ответственный: Руководитель</p>
                <p className="text-sm text-gray-500">Срок: 1 день с даты завершения предыдущего этапа</p>
              </div>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                commercialOfferDoc 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {commercialOfferDoc ? 'В работе' : 'Ожидает'}
              </span>
            </div>
          </div>

          {/* Этап 5: Согласование заказчиком */}
          <div className="border-l-4 border-gray-300 pl-4 py-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">5. Согласование заказчиком</h4>
                <p className="text-sm text-gray-600">Ответственный: Менеджер</p>
                <p className="text-sm text-gray-500">Срок: 3 дня с даты завершения предыдущего этапа</p>
              </div>
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                Ожидает
              </span>
            </div>
          </div>

          {/* Переход к исполнению */}
          {contractDoc && (
            <div className="border-l-4 border-green-500 pl-4 py-3 bg-green-50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">✅ Готов к исполнению работ</h4>
                  <p className="text-sm text-gray-600">Все документы согласованы</p>
                </div>
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  Завершено
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};