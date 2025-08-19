import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, Save, X, MapPin, Phone, User, MessageSquare, Map, Loader, AlertTriangle, Search, Award, ArrowLeft } from 'lucide-react';
import { Contractor, ContractorContact, CreateContractorData } from '../types/Contractor';
import { contractorService } from '../utils/contractorService';
import { ContractorMap } from './ContractorMap';
import { QualificationObjectsList } from './QualificationObjectsList';

export const ContractorDirectory: React.FC = () => {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [filteredContractors, setFilteredContractors] = useState<Contractor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  
  // UI state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContractor, setEditingContractor] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);
  const [showQualificationObjects, setShowQualificationObjects] = useState(false);

  // Form state
  const [newContractor, setNewContractor] = useState<CreateContractorData>({
    name: '',
    address: '',
    contacts: []
  });

  const [editContractor, setEditContractor] = useState({
    name: '',
    address: ''
  });

  // Загрузка контрагентов
  const loadContractors = async () => {
    if (!contractorService.isAvailable()) {
      setError('Supabase не настроен. Проверьте переменные окружения.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await contractorService.getAllContractors();
      setContractors(data);
      setFilteredContractors(data);
      console.log('Контрагенты загружены:', data.length);
    } catch (error) {
      console.error('Ошибка загрузки контрагентов:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContractors();
  }, []);

  // Поиск по контрагентам
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredContractors(contractors);
      return;
    }

    const filtered = contractors.filter(contractor => {
      const searchLower = searchTerm.toLowerCase();
      
      // Поиск по наименованию
      if (contractor.name.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Поиск по адресу
      if (contractor.address && contractor.address.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Поиск по контактам
      return contractor.contacts.some(contact => {
        return (
          contact.employeeName.toLowerCase().includes(searchLower) ||
          (contact.phone && contact.phone.toLowerCase().includes(searchLower)) ||
          (contact.comment && contact.comment.toLowerCase().includes(searchLower))
        );
      });
    });

    setFilteredContractors(filtered);
  }, [searchTerm, contractors]);
  // Добавление контрагента
  const handleAddContractor = async () => {
    if (!newContractor.name.trim()) {
      alert('Введите наименование контрагента');
      return;
    }

    // Проверяем, что у всех контактов заполнено имя сотрудника
    const invalidContacts = newContractor.contacts.filter(contact => !contact.employeeName.trim());
    if (invalidContacts.length > 0) {
      alert('Заполните имена сотрудников для всех контактов');
      return;
    }

    setOperationLoading(true);
    try {
      const addedContractor = await contractorService.addContractor(newContractor);
      setContractors(prev => [...prev, addedContractor]);
      
      // Сбрасываем форму
      setNewContractor({
        name: '',
        address: '',
        contacts: []
      });
      setShowAddForm(false);
      alert('Контрагент успешно добавлен');
    } catch (error) {
      console.error('Ошибка добавления контрагента:', error);
      alert(`Ошибка добавления контрагента: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Редактирование контрагента
  const handleEditContractor = (contractor: Contractor) => {
    setEditContractor({
      name: contractor.name,
      address: contractor.address || ''
    });
    setEditingContractor(contractor.id);
  };

  const handleSaveEdit = async () => {
    if (!editContractor.name.trim()) {
      alert('Введите наименование контрагента');
      return;
    }

    setOperationLoading(true);
    try {
      const updatedContractor = await contractorService.updateContractor(editingContractor!, {
        name: editContractor.name,
        address: editContractor.address || undefined
      });
      
      setContractors(prev => prev.map(c => c.id === editingContractor ? updatedContractor : c));
      setEditingContractor(null);
      alert('Контрагент успешно обновлен');
    } catch (error) {
      console.error('Ошибка обновления контрагента:', error);
      alert(`Ошибка обновления контрагента: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Удаление контрагента
  const handleDeleteContractor = async (contractorId: string) => {
    if (confirm('Вы уверены, что хотите удалить этого контрагента? Все связанные контакты также будут удалены.')) {
      setOperationLoading(true);
      try {
        await contractorService.deleteContractor(contractorId);
        setContractors(prev => prev.filter(c => c.id !== contractorId));
        alert('Контрагент успешно удален');
      } catch (error) {
        console.error('Ошибка удаления контрагента:', error);
        alert(`Ошибка удаления контрагента: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      } finally {
        setOperationLoading(false);
      }
    }
  };

  // Управление контактами в форме добавления
  const addNewContact = () => {
    setNewContractor(prev => ({
      ...prev,
      contacts: [...prev.contacts, { employeeName: '', phone: '', comment: '' }]
    }));
  };

  const updateNewContact = (index: number, field: keyof ContractorContact, value: string) => {
    setNewContractor(prev => ({
      ...prev,
      contacts: prev.contacts.map((contact, i) => 
        i === index ? { ...contact, [field]: value } : contact
      )
    }));
  };

  const removeNewContact = (index: number) => {
    setNewContractor(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index)
    }));
  };

  // Показать контрагента на карте
  const showContractorOnMap = (contractor: Contractor) => {
    if (contractor.latitude && contractor.longitude) {
      setSelectedContractor(contractor);
      setShowMap(true);
    } else {
      alert('Для этого контрагента не определены координаты');
    }
  };

  // Показать объекты квалификации
  const showContractorQualificationObjects = (contractor: Contractor) => {
    setSelectedContractor(contractor);
    setShowQualificationObjects(true);
  };

  if (showMap && selectedContractor) {
    return (
      <ContractorMap
        contractor={selectedContractor}
        onBack={() => {
          setShowMap(false);
          setSelectedContractor(null);
        }}
      />
    );
  }

  if (showQualificationObjects && selectedContractor) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setShowQualificationObjects(false);
              setSelectedContractor(null);
            }}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <Award className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Объекты квалификации</h1>
        </div>
        
        <QualificationObjectsList
          contractorId={selectedContractor.id}
          contractorName={selectedContractor.name}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Индикатор загрузки */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Loader className="animate-spin w-4 h-4 text-blue-600" />
            <span className="text-blue-700">Загрузка контрагентов...</span>
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
          <Building2 className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Справочник контрагентов</h1>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить контрагента</span>
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
            placeholder="Поиск по наименованию, адресу, сотрудникам, телефонам..."
          />
        </div>
        {searchTerm && (
          <div className="mt-2 text-sm text-gray-600">
            Найдено: {filteredContractors.length} из {contractors.length} контрагентов
          </div>
        )}
      </div>
      {/* Add Contractor Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Добавить контрагента</h2>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Основная информация */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Наименование *
                </label>
                <input
                  type="text"
                  value={newContractor.name}
                  onChange={(e) => setNewContractor(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Введите наименование контрагента"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Адрес
                </label>
                <input
                  type="text"
                  value={newContractor.address}
                  onChange={(e) => setNewContractor(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Введите адрес (будет геокодирован автоматически)"
                />
              </div>
            </div>

            {/* Контакты */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Контакты
                </label>
                <button
                  onClick={addNewContact}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Добавить контакт</span>
                </button>
              </div>

              {newContractor.contacts.length === 0 ? (
                <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                  <p className="text-sm">Контакты не добавлены</p>
                  <p className="text-xs mt-1">Нажмите "Добавить контакт" для добавления</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {newContractor.contacts.map((contact, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Сотрудник *</label>
                          <input
                            type="text"
                            value={contact.employeeName}
                            onChange={(e) => updateNewContact(index, 'employeeName', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="ФИО сотрудника"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Телефон</label>
                          <input
                            type="tel"
                            value={contact.phone}
                            onChange={(e) => updateNewContact(index, 'phone', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="+7 (999) 123-45-67"
                          />
                        </div>
                        <div className="flex space-x-2">
                          <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Комментарий</label>
                            <input
                              type="text"
                              value={contact.comment}
                              onChange={(e) => updateNewContact(index, 'comment', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              placeholder="Должность, примечания"
                            />
                          </div>
                          <button
                            onClick={() => removeNewContact(index)}
                            className="mt-5 text-red-600 hover:text-red-800"
                            title="Удалить контакт"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
              onClick={handleAddContractor}
              disabled={operationLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {operationLoading ? 'Добавление...' : 'Добавить'}
            </button>
          </div>
        </div>
      )}

      {/* Contractors Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Контрагент
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Адрес
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Контакты
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredContractors.map((contractor) => (
                <tr key={contractor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingContractor === contractor.id ? (
                      <input
                        type="text"
                        value={editContractor.name}
                        onChange={(e) => setEditContractor(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    ) : (
                      <div>
                        <div className="text-sm font-medium text-gray-900">{contractor.name}</div>
                        <div className="text-xs text-gray-500">
                          Создан: {contractor.createdAt.toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingContractor === contractor.id ? (
                      <input
                        type="text"
                        value={editContractor.address}
                        onChange={(e) => setEditContractor(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Адрес будет геокодирован"
                      />
                    ) : (
                      <div>
                        {contractor.address ? (
                          <div className="flex items-start space-x-2">
                            <div className="flex-1">
                              <div className="text-sm text-gray-900">{contractor.address}</div>
                              {contractor.latitude && contractor.longitude && (
                                <div className="text-xs text-green-600 flex items-center space-x-1 mt-1">
                                  <MapPin className="w-3 h-3" />
                                  <span>Геокодирован</span>
                                </div>
                              )}
                            </div>
                            {contractor.latitude && contractor.longitude && (
                              <button
                                onClick={() => showContractorOnMap(contractor)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Показать на карте"
                              >
                                <Map className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Не указан</span>
                            <button
                              onClick={() => showContractorQualificationObjects(contractor)}
                              disabled={operationLoading}
                              className="text-purple-600 hover:text-purple-900"
                              title="Объекты квалификации"
                            >
                              <Award className="w-4 h-4" />
                            </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {contractor.contacts.length > 0 ? (
                      <div className="space-y-2">
                        {contractor.contacts.map((contact) => (
                          <div key={contact.id} className="text-sm">
                            <div className="flex items-center space-x-1">
                              <User className="w-3 h-3 text-gray-400" />
                              <span className="font-medium">{contact.employeeName}</span>
                            </div>
                            {contact.phone && (
                              <div className="flex items-center space-x-1 text-gray-600">
                                <Phone className="w-3 h-3" />
                                <span>{contact.phone}</span>
                              </div>
                            )}
                            {contact.comment && (
                              <div className="flex items-center space-x-1 text-gray-500">
                                <MessageSquare className="w-3 h-3" />
                                <span className="text-xs">{contact.comment}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">Нет контактов</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingContractor === contractor.id ? (
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
                          onClick={() => setEditingContractor(null)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Отмена"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEditContractor(contractor)}
                          disabled={operationLoading}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Редактировать"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteContractor(contractor.id)}
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

        {filteredContractors.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            {searchTerm ? (
              <>
                <p>По запросу "{searchTerm}" ничего не найдено</p>
                <p className="text-sm">Попробуйте изменить поисковый запрос</p>
              </>
            ) : (
              <>
                <p>Контрагенты не найдены</p>
                <p className="text-sm">Нажмите кнопку "Добавить контрагента" для создания первой записи</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};