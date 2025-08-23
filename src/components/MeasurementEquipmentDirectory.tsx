import React, { useState, useEffect } from 'react';
import { Wrench, Plus, Edit2, Trash2, Save, X, Search, AlertTriangle, Calendar, Package, Hash, Upload, FileText, Download, CheckCircle } from 'lucide-react';
import { 
  MeasurementEquipment, 
  EquipmentVerification,
  CreateMeasurementEquipmentData, 
  UpdateMeasurementEquipmentData,
  CreateEquipmentVerificationData,
  EquipmentType
} from '../types/MeasurementEquipment';
import { measurementEquipmentService } from '../utils/measurementEquipmentService';

const equipmentTypes: EquipmentType[] = ['-', 'Testo 174T', 'Testo 174H'];

export const MeasurementEquipmentDirectory: React.FC = () => {
  const [equipment, setEquipment] = useState<MeasurementEquipment[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<MeasurementEquipment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // UI state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<string | null>(null);
  
  // Form state
  const [newEquipment, setNewEquipment] = useState<CreateMeasurementEquipmentData>({
    type: '-',
    name: '',
    serialNumber: ''
  });

  const [editEquipment, setEditEquipment] = useState<UpdateMeasurementEquipmentData>({});

  // Verification state
  const [selectedEquipmentForVerification, setSelectedEquipmentForVerification] = useState<string | null>(null);
  const [showVerificationForm, setShowVerificationForm] = useState(false);
  const [newVerification, setNewVerification] = useState<CreateEquipmentVerificationData>({
    equipmentId: '',
    verificationStartDate: new Date(),
    verificationEndDate: new Date()
  });

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
      console.error('Ошибка загрузки измерительного оборудования:', error);
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
        item.type.toLowerCase().includes(searchLower) ||
        item.name.toLowerCase().includes(searchLower) ||
        item.serialNumber.toLowerCase().includes(searchLower) ||
        item.verifications.some(v => 
          v.verificationStartDate.toLocaleDateString('ru-RU').includes(searchLower) ||
          v.verificationEndDate.toLocaleDateString('ru-RU').includes(searchLower)
        )
      );
    });

    setFilteredEquipment(filtered);
    setCurrentPage(1);
  }, [searchTerm, equipment]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredEquipment.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEquipment = filteredEquipment.slice(startIndex, endIndex);

  // Добавление оборудования
  const handleAddEquipment = async () => {
    if (newEquipment.type === '-' || !newEquipment.name.trim() || !newEquipment.serialNumber.trim()) {
      alert('Заполните все обязательные поля');
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
      alert('Измерительное оборудование успешно добавлено');
    } catch (error) {
      console.error('Ошибка добавления измерительного оборудования:', error);
      alert(`Ошибка добавления: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
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
    if (editEquipment.type === '-' || !editEquipment.name?.trim() || !editEquipment.serialNumber?.trim()) {
      alert('Заполните все обязательные поля');
      return;
    }

    setOperationLoading(true);
    try {
      const updatedEquipment = await measurementEquipmentService.updateEquipment(
        editingEquipment!,
        editEquipment
      );
      
      setEquipment(prev => prev.map(item => 
        item.id === editingEquipment ? updatedEquipment : item
      ));
      
      setEditingEquipment(null);
      setEditEquipment({});
      alert('Измерительное оборудование успешно обновлено');
    } catch (error) {
      console.error('Ошибка обновления измерительного оборудования:', error);
      alert(`Ошибка обновления: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Удаление оборудования
  const handleDeleteEquipment = async (equipmentId: string) => {
    if (confirm('Вы уверены, что хотите удалить это измерительное оборудование?')) {
      setOperationLoading(true);
      try {
        await measurementEquipmentService.deleteEquipment(equipmentId);
        setEquipment(prev => prev.filter(item => item.id !== equipmentId));
        alert('Измерительное оборудование успешно удалено');
      } catch (error) {
        console.error('Ошибка удаления измерительного оборудования:', error);
        alert(`Ошибка удаления: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      } finally {
        setOperationLoading(false);
      }
    }
  };

  // Отмена редактирования
  const handleCancelEdit = () => {
    setEditingEquipment(null);
    setEditEquipment({});
  };

  // Добавление записи о поверке
  const handleAddVerification = async () => {
    if (!newVerification.verificationStartDate || !newVerification.verificationEndDate) {
      alert('Заполните период поверки');
      return;
    }

    if (newVerification.verificationEndDate <= newVerification.verificationStartDate) {
      alert('Дата окончания должна быть позже даты начала');
      return;
    }

    setOperationLoading(true);
    try {
      const addedVerification = await measurementEquipmentService.addVerification(newVerification);
      
      // Обновляем оборудование с новой записью о поверке
      setEquipment(prev => prev.map(item => 
        item.id === newVerification.equipmentId 
          ? { ...item, verifications: [...item.verifications, addedVerification] }
          : item
      ));
      
      // Сбрасываем форму
      setNewVerification({
        equipmentId: '',
        verificationStartDate: new Date(),
        verificationEndDate: new Date()
      });
      setShowVerificationForm(false);
      setSelectedEquipmentForVerification(null);
      alert('Запись о поверке успешно добавлена');
    } catch (error) {
      console.error('Ошибка добавления записи о поверке:', error);
      alert(`Ошибка добавления записи о поверке: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Удаление записи о поверке
  const handleDeleteVerification = async (verificationId: string, equipmentId: string) => {
    if (confirm('Вы уверены, что хотите удалить эту запись о поверке?')) {
      setOperationLoading(true);
      try {
        await measurementEquipmentService.deleteVerification(verificationId);
        
        // Обновляем оборудование, удаляя запись о поверке
        setEquipment(prev => prev.map(item => 
          item.id === equipmentId 
            ? { ...item, verifications: item.verifications.filter(v => v.id !== verificationId) }
            : item
        ));
        
        alert('Запись о поверке успешно удалена');
      } catch (error) {
        console.error('Ошибка удаления записи о поверке:', error);
        alert(`Ошибка удаления записи о поверке: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      } finally {
        setOperationLoading(false);
      }
    }
  };

  // Показать форму добавления поверки
  const handleShowVerificationForm = (equipmentId: string) => {
    setSelectedEquipmentForVerification(equipmentId);
    setNewVerification(prev => ({
      ...prev,
      equipmentId
    }));
    setShowVerificationForm(true);
  };

  // Получение актуальной поверки (последней по дате окончания)
  const getCurrentVerification = (equipment: MeasurementEquipment): EquipmentVerification | null => {
    if (equipment.verifications.length === 0) return null;
    
    // Сортируем по дате окончания и берем последнюю
    const sortedVerifications = [...equipment.verifications].sort(
      (a, b) => b.verificationEndDate.getTime() - a.verificationEndDate.getTime()
    );
    
    return sortedVerifications[0];
  };

  // Проверка истечения срока поверки
  const isVerificationExpired = (date: Date): boolean => {
    return date < new Date();
  };

  const isVerificationExpiringSoon = (date: Date): boolean => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    return date <= thirtyDaysFromNow && date >= today;
  };

  const getVerificationStatusColor = (date: Date): string => {
    if (isVerificationExpired(date)) {
      return 'bg-red-100 text-red-800';
    } else if (isVerificationExpiringSoon(date)) {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-green-100 text-green-800';
    }
  };

  // Обработка загрузки файла поверки
  const handleVerificationFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Можно загружать только файлы в формате PDF');
        return;
      }
      setNewVerification(prev => ({
        ...prev,
        verificationFile: file
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Индикатор загрузки */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
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
            placeholder="Поиск по виду, наименованию, серийному номеру, дате поверки..."
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
            <h2 className="text-lg font-semibold text-gray-900">Добавить измерительное оборудование</h2>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Вид *
              </label>
              <select
                value={newEquipment.type}
                onChange={(e) => setNewEquipment(prev => ({ ...prev, type: e.target.value as EquipmentType }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {equipmentTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
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
                placeholder="Введите наименование оборудования"
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

      {/* Add Verification Form */}
      {showVerificationForm && selectedEquipmentForVerification && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Добавить запись о поверке</h2>
            <button
              onClick={() => {
                setShowVerificationForm(false);
                setSelectedEquipmentForVerification(null);
                setNewVerification({
                  equipmentId: '',
                  verificationStartDate: new Date(),
                  verificationEndDate: new Date()
                });
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Период поверки с *
              </label>
              <input
                type="date"
                value={newVerification.verificationStartDate.toISOString().split('T')[0]}
                onChange={(e) => setNewVerification(prev => ({ 
                  ...prev, 
                  verificationStartDate: new Date(e.target.value) 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Период поверки по *
              </label>
              <input
                type="date"
                value={newVerification.verificationEndDate.toISOString().split('T')[0]}
                onChange={(e) => setNewVerification(prev => ({ 
                  ...prev, 
                  verificationEndDate: new Date(e.target.value) 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Файл поверки (PDF)
              </label>
              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <Upload className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Выбрать файл</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleVerificationFileChange}
                    className="hidden"
                  />
                </label>
                {newVerification.verificationFile && (
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-600">{newVerification.verificationFile.name}</span>
                    <button
                      onClick={() => setNewVerification(prev => ({ ...prev, verificationFile: undefined }))}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => {
                setShowVerificationForm(false);
                setSelectedEquipmentForVerification(null);
              }}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleAddVerification}
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
                  Вид
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Наименование
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Серийный №
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Поверка
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
                        value={editEquipment.type || ''}
                        onChange={(e) => setEditEquipment(prev => ({ ...prev, type: e.target.value as EquipmentType }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        {equipmentTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Package className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{item.type}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingEquipment === item.id ? (
                      <input
                        type="text"
                        value={editEquipment.name || ''}
                        onChange={(e) => setEditEquipment(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    ) : (
                      <div className="text-sm text-gray-900">{item.name}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingEquipment === item.id ? (
                      <input
                        type="text"
                        value={editEquipment.serialNumber || ''}
                        onChange={(e) => setEditEquipment(prev => ({ ...prev, serialNumber: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Hash className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900 font-mono">{item.serialNumber}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingEquipment === item.id ? (
                      <div className="text-sm text-gray-500">
                        Редактирование поверки недоступно
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {item.verifications.length > 0 ? (
                          <>
                            {item.verifications.slice(0, 2).map((verification) => (
                              <div key={verification.id} className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Calendar className="w-4 h-4 text-gray-400" />
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getVerificationStatusColor(verification.verificationEndDate)}`}>
                                    {verification.verificationStartDate.toLocaleDateString('ru-RU')} - {verification.verificationEndDate.toLocaleDateString('ru-RU')}
                                  </span>
                                  {verification.verificationFileUrl && (
                                    <a
                                      href={verification.verificationFileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800"
                                      title="Открыть файл поверки"
                                    >
                                      <FileText className="w-3 h-3" />
                                    </a>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleDeleteVerification(verification.id, item.id)}
                                  className="text-red-600 hover:text-red-800 ml-2"
                                  title="Удалить запись о поверке"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            {item.verifications.length > 2 && (
                              <div className="text-xs text-gray-500">
                                +{item.verifications.length - 2} записей
                              </div>
                            )}
                            <button
                              onClick={() => handleShowVerificationForm(item.id)}
                              className="text-green-600 hover:text-green-800 text-xs flex items-center space-x-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Добавить поверку</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleShowVerificationForm(item.id)}
                            className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center space-x-1"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Добавить поверку</span>
                          </button>
                        )}
                      </div>
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
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNum
                            ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
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

      {/* Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Статистика оборудования</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">{equipment.length}</div>
            <div className="text-sm text-gray-500">Всего единиц</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {equipment.filter(item => {
                const currentVerification = getCurrentVerification(item);
                return currentVerification && !isVerificationExpired(currentVerification.verificationEndDate) && !isVerificationExpiringSoon(currentVerification.verificationEndDate);
              }).length}
            </div>
            <div className="text-sm text-gray-500">Поверка актуальна</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {equipment.filter(item => {
                const currentVerification = getCurrentVerification(item);
                return currentVerification && isVerificationExpiringSoon(currentVerification.verificationEndDate);
              }).length}
            </div>
            <div className="text-sm text-gray-500">Истекает в течение 30 дней</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {equipment.filter(item => {
                const currentVerification = getCurrentVerification(item);
                return currentVerification && isVerificationExpired(currentVerification.verificationEndDate);
              }).length}
            </div>
            <div className="text-sm text-gray-500">Просрочена поверка</div>
          </div>
        </div>
      </div>
    </div>
  );
};