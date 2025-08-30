import React, { useState, useEffect } from 'react';
import { Wrench, Plus, Edit2, Trash2, Save, X, Search, Eye, AlertTriangle, Loader, ChevronLeft, ChevronRight, Upload, Download, Calendar, FileImage } from 'lucide-react';
import { Equipment, EquipmentType, EquipmentTypeLabels, EquipmentTypeColors, CreateEquipmentData, EquipmentVerification } from '../types/Equipment';
import { equipmentService } from '../utils/equipmentService';

export const EquipmentDirectory: React.FC = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const itemsPerPage = 10;
  
  // UI state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<string | null>(null);
  const [viewingEquipment, setViewingEquipment] = useState<Equipment | null>(null);
  
  // Statistics
  const [stats, setStats] = useState<{
    total: number;
    byType: Record<EquipmentType, number>;
  }>({
    total: 0,
    byType: { '-': 0, 'Testo 174T': 0, 'Testo 174H': 0 }
  });

  // Form state
  const [newEquipment, setNewEquipment] = useState<CreateEquipmentData>({
    type: '-',
    name: '',
    serialNumber: '',
    verifications: []
  });

  const [editEquipment, setEditEquipment] = useState<{
    type: EquipmentType;
    name: string;
    serialNumber: string;
    verifications: Omit<EquipmentVerification, 'id' | 'equipmentId' | 'createdAt'>[];
  }>({
    type: '-',
    name: '',
    serialNumber: '',
    verifications: []
  });

  // Загрузка оборудования
  const loadEquipment = async (page: number = 1, search?: string, sort: 'asc' | 'desc' = 'asc') => {
    if (!equipmentService.isAvailable()) {
      setError('Supabase не настроен. Проверьте переменные окружения.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await equipmentService.getAllEquipment(page, itemsPerPage, search, sort);
      setEquipment(result.equipment);
      setFilteredEquipment(result.equipment);
      setTotalPages(result.totalPages);
      setTotalItems(result.total);
      setCurrentPage(page);
      setSortOrder(sort);
      
      console.log('Оборудование загружено:', result.equipment.length);
    } catch (error) {
      console.error('Ошибка загрузки оборудования:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка статистики
  const loadStats = async () => {
    if (!equipmentService.isAvailable()) return;

    try {
      const statsData = await equipmentService.getEquipmentStats();
      setStats(statsData);
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
  };

  useEffect(() => {
    loadEquipment(1);
    loadStats();
  }, []);

  // Поиск с задержкой
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== undefined) {
        loadEquipment(1, searchTerm, sortOrder);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, sortOrder]);

  // Валидация наименования (формат DL-XXX)
  const validateName = (name: string): boolean => {
    const pattern = /^DL-\d{3}$/;
    return pattern.test(name);
  };

  // Добавление оборудования
  const handleAddEquipment = async () => {
    if (!newEquipment.name || !newEquipment.serialNumber) {
      alert('Заполните все поля');
      return;
    }

    if (!validateName(newEquipment.name)) {
      alert('Наименование должно быть в формате DL-XXX (например, DL-001)');
      return;
    }

    setOperationLoading(true);
    try {
      const addedEquipment = await equipmentService.addEquipment(newEquipment);
      
      // Перезагружаем данные
      await loadEquipment(currentPage, searchTerm);
      await loadStats();
      
      // Сбрасываем форму
      setNewEquipment({
        type: '-',
        name: '',
        serialNumber: '',
        verifications: []
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
  const handleEditEquipment = (equipment: Equipment) => {
    setEditEquipment({
      type: equipment.type,
      name: equipment.name,
      serialNumber: equipment.serialNumber,
      verifications: equipment.verifications.map(v => ({
        verificationStartDate: v.verificationStartDate,
        verificationEndDate: v.verificationEndDate,
        verificationFileUrl: v.verificationFileUrl,
        verificationFileName: v.verificationFileName
      }))
    });
    setEditingEquipment(equipment.id);
  };

  const handleSaveEdit = async () => {
    if (!editEquipment.name || !editEquipment.serialNumber) {
      alert('Заполните все поля');
      return;
    }

    if (!validateName(editEquipment.name)) {
      alert('Наименование должно быть в формате DL-XXX (например, DL-001)');
      return;
    }

    setOperationLoading(true);
    try {
      await equipmentService.updateEquipment(editingEquipment!, editEquipment);
      
      // Перезагружаем данные
      await loadEquipment(currentPage, searchTerm);
      await loadStats();
      
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
        await equipmentService.deleteEquipment(equipmentId);
        
        // Перезагружаем данные
        await loadEquipment(currentPage, searchTerm);
        await loadStats();
        
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
  const handleViewEquipment = (equipment: Equipment) => {
    setViewingEquipment(equipment);
  };

  // Пагинация
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      loadEquipment(page, searchTerm, sortOrder);
    }
  };

  // Генерация следующего наименования
  const generateNextName = () => {
    const existingNumbers = equipment
      .map(eq => eq.name.match(/^DL-(\d{3})$/)?.[1])
      .filter(Boolean)
      .map(num => parseInt(num!))
      .sort((a, b) => a - b);

    let nextNumber = 1;
    for (const num of existingNumbers) {
      if (num === nextNumber) {
        nextNumber++;
      } else {
        break;
      }
    }

    const formattedNumber = nextNumber.toString().padStart(3, '0');
    setNewEquipment(prev => ({ ...prev, name: `DL-${formattedNumber}` }));
  };

  // Управление аттестациями в форме добавления
  const addNewVerification = (isEdit = false) => {
    const newVerification = {
      verificationStartDate: new Date(),
      verificationEndDate: new Date(),
      verificationFileUrl: undefined,
      verificationFileName: undefined
    };

    if (isEdit) {
      setEditEquipment(prev => ({
        ...prev,
        verifications: [...prev.verifications, newVerification]
      }));
    } else {
      setNewEquipment(prev => ({
        ...prev,
        verifications: [...(prev.verifications || []), newVerification]
      }));
    }
  };

  const updateVerification = (index: number, field: keyof EquipmentVerification, value: any, isEdit = false) => {
    if (isEdit) {
      setEditEquipment(prev => ({
        ...prev,
        verifications: prev.verifications.map((verification, i) => 
          i === index ? { ...verification, [field]: value } : verification
        )
      }));
    } else {
      setNewEquipment(prev => ({
        ...prev,
        verifications: (prev.verifications || []).map((verification, i) => 
          i === index ? { ...verification, [field]: value } : verification
        )
      }));
    }
  };

  const removeVerification = (index: number, isEdit = false) => {
    if (isEdit) {
      setEditEquipment(prev => ({
        ...prev,
        verifications: prev.verifications.filter((_, i) => i !== index)
      }));
    } else {
      setNewEquipment(prev => ({
        ...prev,
        verifications: (prev.verifications || []).filter((_, i) => i !== index)
      }));
    }
  };

  const handleVerificationFileUpload = async (index: number, file: File, isEdit = false) => {
    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      alert('Поддерживаются только изображения');
      return;
    }

    // Создаем URL для предварительного просмотра
    const fileUrl = URL.createObjectURL(file);
    
    updateVerification(index, 'verificationFileUrl', fileUrl, isEdit);
    updateVerification(index, 'verificationFileName', file.name, isEdit);
  };

  // Функция для рендеринга блока аттестаций
  const renderVerificationsBlock = (verifications: any[], isEdit = false) => (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-gray-700">
          Метрологическая аттестация
        </label>
        <button
          type="button"
          onClick={() => addNewVerification(isEdit)}
          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors flex items-center space-x-1"
        >
          <Plus className="w-3 h-3" />
          <span>Добавить период</span>
        </button>
      </div>

      {verifications.length === 0 ? (
        <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
          <p className="text-sm">Периоды аттестации не добавлены</p>
          <p className="text-xs mt-1">Нажмите "Добавить период" для добавления</p>
        </div>
      ) : (
        <div className="space-y-3">
          {verifications.map((verification, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Дата начала *</label>
                  <input
                    type="date"
                    value={verification.verificationStartDate instanceof Date 
                      ? verification.verificationStartDate.toISOString().split('T')[0]
                      : verification.verificationStartDate
                    }
                    onChange={(e) => updateVerification(index, 'verificationStartDate', new Date(e.target.value), isEdit)}
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Дата окончания *</label>
                  <input
                    type="date"
                    value={verification.verificationEndDate instanceof Date 
                      ? verification.verificationEndDate.toISOString().split('T')[0]
                      : verification.verificationEndDate
                    }
                    onChange={(e) => updateVerification(index, 'verificationEndDate', new Date(e.target.value), isEdit)}
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Загрузка файла свидетельства */}
              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1">Свидетельство о поверке</label>
                {verification.verificationFileUrl ? (
                  <div className="flex items-center justify-between bg-white p-2 border border-gray-300 rounded">
                    <div className="flex items-center space-x-2">
                      <FileImage className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-700">
                        {verification.verificationFileName || 'Файл загружен'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => window.open(verification.verificationFileUrl, '_blank')}
                        className="text-blue-600 hover:text-blue-800"
                        title="Просмотреть"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateVerification(index, 'verificationFileUrl', undefined, isEdit);
                          updateVerification(index, 'verificationFileName', undefined, isEdit);
                        }}
                        className="text-red-600 hover:text-red-800"
                        title="Удалить файл"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded p-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleVerificationFileUpload(index, file, isEdit);
                        }
                      }}
                      className="hidden"
                      id={`verification-file-${index}-${isEdit ? 'edit' : 'new'}`}
                    />
                    <label
                      htmlFor={`verification-file-${index}-${isEdit ? 'edit' : 'new'}`}
                      className="cursor-pointer flex flex-col items-center space-y-1"
                    >
                      <Upload className="w-5 h-5 text-gray-400" />
                      <span className="text-xs text-gray-600">Загрузить изображение</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => removeVerification(index, isEdit)}
                  className="text-red-600 hover:text-red-800 text-sm flex items-center space-x-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Удалить период</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Индикатор загрузки */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Loader className="animate-spin w-4 h-4 text-blue-600" />
            <span className="text-blue-700">Загрузка оборудования...</span>
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
          <h1 className="text-2xl font-bold text-gray-900">Оборудование</h1>
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
            placeholder="Поиск по типу, наименованию, серийному номеру..."
          />
        </div>
        {searchTerm && (
          <div className="mt-2 text-sm text-gray-600">
            Найдено: {totalItems} результатов
          </div>
        )}
      </div>

      {/* Add Equipment Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6 max-w-4xl mx-auto">
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
                Тип
              </label>
              <select
                value={newEquipment.type}
                onChange={(e) => setNewEquipment(prev => ({ ...prev, type: e.target.value as EquipmentType }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="-">Не указано</option>
                <option value="Testo 174T">Testo 174T</option>
                <option value="Testo 174H">Testo 174H</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Наименование (формат DL-XXX)
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newEquipment.name}
                  onChange={(e) => setNewEquipment(prev => ({ ...prev, name: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="DL-001"
                  pattern="DL-\d{3}"
                />
                <button
                  type="button"
                  onClick={generateNextName}
                  className="bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm"
                  title="Сгенерировать следующий номер"
                >
                  Авто
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Серийный номер
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

          {/* Блок метрологической аттестации для редактирования */}
          <div className="mt-6">
            {renderVerificationsBlock(editEquipment.verifications || [], true)}
          </div>

          {/* Блок метрологической аттестации */}
          <div className="mt-6">
            {renderVerificationsBlock(newEquipment.verifications || [], false)}
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
                  <button
                    onClick={() => {
                      const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
                      setSortOrder(newOrder);
                      loadEquipment(currentPage, searchTerm, newOrder);
                    }}
                    className="flex items-center space-x-1 hover:text-gray-700"
                  >
                    <span>Наименование</span>
                    <span className="text-xs">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  </button>
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
              {equipment.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingEquipment === item.id ? (
                      <input
                        type="text"
                        value={editEquipment.name}
                        onChange={(e) => setEditEquipment(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        pattern="DL-\d{3}"
                        placeholder="DL-001"
                      />
                    ) : (
                      <div>
                        <div className="text-sm font-medium text-gray-900 font-mono">{item.name}</div>
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
                        placeholder="Серийный номер"
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

        {/* Empty state */}
        {equipment.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            <Wrench className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            {searchTerm ? (
              <>
                <p>По запросу "{searchTerm}" ничего не найдено</p>
                <p className="text-sm">Попробуйте изменить поисковый запрос</p>
              </>
            ) : (
              <>
                <p>Оборудование не найдено</p>
                <p className="text-sm">Нажмите кнопку "Добавить оборудование" для создания первой записи</p>
              </>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                Предыдущая
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                Следующая
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Показано <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> до{' '}
                  <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> из{' '}
                  <span className="font-medium">{totalItems}</span> результатов
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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
                        onClick={() => handlePageChange(pageNum)}
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
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* View Equipment Modal */}
      {viewingEquipment && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Просмотр оборудования</h2>
            <button
              onClick={() => setViewingEquipment(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Основная информация</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500">Тип</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${EquipmentTypeColors[viewingEquipment.type]}`}>
                    {EquipmentTypeLabels[viewingEquipment.type]}
                  </span>
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Наименование</label>
                  <p className="text-sm font-medium text-gray-900 font-mono">{viewingEquipment.name}</p>
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Серийный номер</label>
                  <p className="text-sm font-medium text-gray-900 font-mono">{viewingEquipment.serialNumber}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Системная информация</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500">Дата создания</label>
                  <p className="text-sm text-gray-900">
                    {viewingEquipment.createdAt.toLocaleString('ru-RU')}
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Последнее обновление</label>
                  <p className="text-sm text-gray-900">
                    {viewingEquipment.updatedAt.toLocaleString('ru-RU')}
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-gray-500">ID в системе</label>
                  <p className="text-xs text-gray-500 font-mono">{viewingEquipment.id}</p>
                </div>
              </div>
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
      )}

      {/* Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Статистика оборудования</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">{stats.total}</div>
            <div className="text-sm text-gray-500">Всего оборудования</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.byType['Testo 174T']}</div>
            <div className="text-sm text-gray-500">Testo 174T</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.byType['Testo 174H']}</div>
            <div className="text-sm text-gray-500">Testo 174H</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.byType['-']}</div>
            <div className="text-sm text-gray-500">Не указано</div>
          </div>
        </div>
      </div>
    </div>
  );
};