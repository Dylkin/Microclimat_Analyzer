import React, { useState, useEffect } from 'react';
import { Wrench, Plus, Edit2, Trash2, Save, X, Search, Eye, AlertTriangle, Loader } from 'lucide-react';
import { MeasurementEquipment, EquipmentType, EquipmentTypeLabels, CreateMeasurementEquipmentData } from '../types/MeasurementEquipment';
import { measurementEquipmentService } from '../utils/measurementEquipmentService';

export const MeasurementEquipmentDirectory: React.FC = () => {
  const [equipment, setEquipment] = useState<MeasurementEquipment[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<MeasurementEquipment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  
  // UI state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<string | null>(null);
  const [viewingEquipment, setViewingEquipment] = useState<MeasurementEquipment | null>(null);

  // Form state
  const [newEquipment, setNewEquipment] = useState<CreateMeasurementEquipmentData>({
    type: '-',
    name: '',
    serialNumber: ''
  });

  const [editEquipment, setEditEquipment] = useState<{
    type: EquipmentType;
    name: string;
    serialNumber: string;
  }>({
    type: '-',
    name: '',
    serialNumber: ''
  });

  // Пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Загрузка оборудования
  const loadEquipment = async () => {
    if (!measurementEquipmentService.isAvailable()) {
      setError('Supabase не настроен. Проверьте переменные окружения.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await measurementEquipmentService.getAllEquipment();
      setEquipment(data);
      setFilteredEquipment(data);
      console.log('Измерительное оборудование загружено:', data.length);
    } catch (error) {
      console.error('Ошибка загрузки оборудования:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEquipment();
  }, []);

  // Поиск по оборудованию
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredEquipment(equipment);
      setCurrentPage(1);
      return;
    }

    const filtered = equipment.filter(item => {
      const searchLower = searchTerm.toLowerCase();
      
      return (
        item.name.toLowerCase().includes(searchLower) ||
        item.serialNumber.toLowerCase().includes(searchLower) ||
        EquipmentTypeLabels[item.type].toLowerCase().includes(searchLower)
      );
    });

    setFilteredEquipment(filtered);
    setCurrentPage(1);
  }, [searchTerm, equipment]);

  // Пагинация
  const totalPages = Math.ceil(filteredEquipment.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEquipment = filteredEquipment.slice(startIndex, endIndex);

  // Добавление оборудования
  const handleAddEquipment = async () => {
    if (!newEquipment.name.trim() || !newEquipment.serialNumber.trim()) {
      alert('Заполните все обязательные поля');
      return;
    }

    // Проверяем уникальность серийного номера
    if (equipment.some(e => e.serialNumber === newEquipment.serialNumber)) {
      alert('Оборудование с таким серийным номером уже существует');
      return;
    }

    setOperationLoading(true);
    try {
      const addedEquipment = await measurementEquipmentService.addEquipment(newEquipment);
      setEquipment(prev => [addedEquipment, ...prev]);
      
      // Сбрасываем форму
      setNewEquipment({
        type: '-',
        name: '',
        serialNumber: ''
      });
      setShowAddForm(false);
      alert('Оборудование успешно добавлено');
    } catch (error) {
      console.error('Ошибка добавления оборудования:', error);
      alert(`Ошибка добавления оборудования: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Редактирование оборудования
  const handleEditEquipment = (item: MeasurementEquipment) => {
    setEditEquipment({
      type: item.type,
      name: item.name,
      serialNumber: item.serialNumber
    });
    setEditingEquipment(item.id);
  };

  const handleSaveEdit = async () => {
    if (!editEquipment.name.trim() || !editEquipment.serialNumber.trim()) {
      alert('Заполните все обязательные поля');
      return;
    }

    // Проверяем уникальность серийного номера (исключая текущее оборудование)
    if (equipment.some(e => e.serialNumber === editEquipment.serialNumber && e.id !== editingEquipment)) {
      alert('Оборудование с таким серийным номером уже существует');
      return;
    }

    setOperationLoading(true);
    try {
      const updatedEquipment = await measurementEquipmentService.updateEquipment(editingEquipment!, editEquipment);
      setEquipment(prev => prev.map(e => e.id === editingEquipment ? updatedEquipment : e));
      setEditingEquipment(null);
      alert('Оборудование успешно обновлено');
    } catch (error) {
      console.error('Ошибка обновления оборудования:', error);
      alert(`Ошибка обновления оборудования: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Удаление оборудования
  const handleDeleteEquipment = async (equipmentId: string) => {
    if (confirm('Вы уверены, что хотите удалить это оборудование?')) {
      setOperationLoading(true);
      try {
        await measurementEquipmentService.deleteEquipment(equipmentId);
        setEquipment(prev => prev.filter(e => e.id !== equipmentId));
        alert('Оборудование успешно удалено');
      } catch (error) {
        console.error('Ошибка удаления оборудования:', error);
        alert(`Ошибка удаления оборудования: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      } finally {
        setOperationLoading(false);
      }
    }
  };

  // Просмотр оборудования
  const handleViewEquipment = (item: MeasurementEquipment) => {
    setViewingEquipment(item);
  };

  return (
    <div className="space-y-6">
      {/* Индикатор загрузки */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Loader className="animate-spin w-4 h-4 text-blue-600" />
            <span className="text-blue-700">Загрузка измерительного оборудования...</span>
          </div>
        </div>
      )}

      {/* Ошибка */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Ошибка загрузки данных</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Wrench className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Измерительное оборудование</h1>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить оборудование</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Поиск по наименованию, серийному номеру, типу..."
          />
        </div>
        {searchTerm && (
          <div className="mt-2 text-sm text-gray-600">
            Найдено: {filteredEquipment.length} из {equipment.length} единиц оборудования
          </div>
        )}
      </div>

      {/* Add Equipment Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Добавить оборудование</h2>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Тип *
              </label>
              <select
                value={newEquipment.type}
                onChange={(e) => setNewEquipment(prev => ({ ...prev, type: e.target.value as EquipmentType }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {Object.entries(EquipmentTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Наименование *
              </label>
              <input
                type="text"
                value={newEquipment.name}
                onChange={(e) => setNewEquipment(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите наименование"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Серийный номер *
              </label>
              <input
                type="text"
                value={newEquipment.serialNumber}
                onChange={(e) => setNewEquipment(prev => ({ ...prev, serialNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите серийный номер"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleAddEquipment}
              disabled={operationLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {operationLoading ? 'Добавление...' : 'Добавить'}
            </button>
          </div>
        </div>
      )}

      {/* Equipment Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
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
                  Серийный №
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentEquipment.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingEquipment === item.id ? (
                      <select
                        value={editEquipment.type}
                        onChange={(e) => setEditEquipment(prev => ({ ...prev, type: e.target.value as EquipmentType }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        {Object.entries(EquipmentTypeLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {EquipmentTypeLabels[item.type]}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingEquipment === item.id ? (
                      <input
                        type="text"
                        value={editEquipment.name}
                        onChange={(e) => setEditEquipment(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    ) : (
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-500">
                          Создано: {item.createdAt.toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingEquipment === item.id ? (
                      <input
                        type="text"
                        value={editEquipment.serialNumber}
                        onChange={(e) => setEditEquipment(prev => ({ ...prev, serialNumber: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    ) : (
                      <div className="text-sm text-gray-900 font-mono">{item.serialNumber}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingEquipment === item.id ? (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={handleSaveEdit}
                          disabled={operationLoading}
                          className="text-green-600 hover:text-green-900"
                          title="Сохранить"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingEquipment(null)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Отмена"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleViewEquipment(item)}
                          disabled={operationLoading}
                          className="text-blue-600 hover:text-blue-900"
                          title="Просмотр"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditEquipment(item)}
                          disabled={operationLoading}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Редактировать"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEquipment(item.id)}
                          disabled={operationLoading}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                Предыдущая
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                Следующая
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Показано <span className="font-medium">{startIndex + 1}</span> до{' '}
                  <span className="font-medium">{Math.min(endIndex, filteredEquipment.length)}</span> из{' '}
                  <span className="font-medium">{filteredEquipment.length}</span> результатов
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    Предыдущая
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    Следующая
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {filteredEquipment.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            <Wrench className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            {searchTerm ? (
              <>
                <p>По запросу "{searchTerm}" ничего не найдено</p>
                <p className="text-sm">Попробуйте изменить поисковый запрос</p>
              </>
            ) : (
              <>
                <p>Измерительное оборудование не найдено</p>
                <p className="text-sm">Нажмите кнопку "Добавить оборудование" для создания первой записи</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* View Equipment Modal */}
      {viewingEquipment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Просмотр оборудования</h3>
              <button
                onClick={() => setViewingEquipment(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Тип</label>
                <p className="text-gray-900">{EquipmentTypeLabels[viewingEquipment.type]}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Наименование</label>
                <p className="text-gray-900">{viewingEquipment.name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Серийный номер</label>
                <p className="text-gray-900 font-mono">{viewingEquipment.serialNumber}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Дата создания</label>
                <p className="text-gray-900">{viewingEquipment.createdAt.toLocaleDateString('ru-RU')}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Последнее обновление</label>
                <p className="text-gray-900">{viewingEquipment.updatedAt.toLocaleDateString('ru-RU')}</p>
              </div>
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setViewingEquipment(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Статистика</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">{equipment.length}</div>
            <div className="text-sm text-gray-500">Всего оборудования</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {equipment.filter(e => e.type === 'Testo 174T').length}
            </div>
            <div className="text-sm text-gray-500">Testo 174T</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {equipment.filter(e => e.type === 'Testo 174H').length}
            </div>
            <div className="text-sm text-gray-500">Testo 174H</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {equipment.filter(e => e.type === '-').length}
            </div>
            <div className="text-sm text-gray-500">Не указан тип</div>
          </div>
        </div>
      </div>
    </div>
  );
};