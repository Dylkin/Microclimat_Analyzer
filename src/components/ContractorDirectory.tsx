import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, Save, X, MapPin, Phone, User, MessageSquare, Map, Loader, AlertTriangle, Search, ArrowLeft, Eye } from 'lucide-react';
import { Contractor, ContractorContact, CreateContractorData } from '../types/Contractor';
import { QualificationObject, CreateQualificationObjectData } from '../types/QualificationObject';
import { contractorService } from '../utils/contractorService';
import { qualificationObjectService } from '../utils/qualificationObjectService';
import { ContractorMap } from './ContractorMap';
import { QualificationObjectForm } from './QualificationObjectForm';
import { QualificationObjectsTable } from './QualificationObjectsTable';

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
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingContractorData, setEditingContractorData] = useState<Contractor | null>(null);
  const [viewingContractor, setViewingContractor] = useState<Contractor | null>(null);
  
  // Qualification objects state
  const [qualificationObjects, setQualificationObjects] = useState<QualificationObject[]>([]);
  const [filteredQualificationObjects, setFilteredQualificationObjects] = useState<QualificationObject[]>([]);
  const [qualificationSearchTerm, setQualificationSearchTerm] = useState('');
  const [showAddQualificationForm, setShowAddQualificationForm] = useState(false);
  const [editingQualificationObject, setEditingQualificationObject] = useState<QualificationObject | null>(null);

  // Form state
  const [newContractor, setNewContractor] = useState<CreateContractorData>({
    name: '',
    address: '',
    contacts: []
  });

  const [editContractor, setEditContractor] = useState<{
    name: string;
    address: string;
    contacts: Omit<ContractorContact, 'id' | 'contractorId' | 'createdAt'>[];
  }>({
    name: '',
    address: '',
    contacts: []
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

  // Загрузка объектов квалификации для контрагента
  const loadQualificationObjects = async (contractorId: string) => {
    if (!qualificationObjectService.isAvailable()) {
      setError('Supabase не настроен для работы с объектами квалификации');
      return;
    }

    setLoading(true);
    try {
      const objects = await qualificationObjectService.getQualificationObjectsByContractor(contractorId);
      setQualificationObjects(objects);
      setFilteredQualificationObjects(objects);
    } catch (error) {
      console.error('Ошибка загрузки объектов квалификации:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  // Поиск по объектам квалификации
  useEffect(() => {
    if (!qualificationSearchTerm.trim()) {
      setFilteredQualificationObjects(qualificationObjects);
      return;
    }

    const filtered = qualificationObjects.filter(obj => {
      const searchLower = qualificationSearchTerm.toLowerCase();
      
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

    setFilteredQualificationObjects(filtered);
  }, [qualificationSearchTerm, qualificationObjects]);

  // Добавление контрагента
  const handleAddContractor = async () => {
    if (!newContractor.name.trim()) {
      return;
    }

    // Проверяем, что у всех контактов заполнено имя сотрудника
    const invalidContacts = newContractor.contacts.filter(contact => !contact.employeeName.trim());
    if (invalidContacts.length > 0) {
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
    } catch (error) {
      console.error('Ошибка добавления контрагента:', error);
    } finally {
      setOperationLoading(false);
    }
  };

  // Редактирование контрагента
  const handleEditContractor = (contractor: Contractor) => {
    setEditContractor({
      name: contractor.name,
      address: contractor.address || '',
      contacts: contractor.contacts.map(contact => ({
        employeeName: contact.employeeName,
        phone: contact.phone || '',
        comment: contact.comment || ''
      }))
    });
    setEditingContractorData(contractor);
    setShowEditForm(true);
    // Загружаем объекты квалификации для редактируемого контрагента
    loadQualificationObjects(contractor.id);
  };

  const handleSaveEdit = async () => {
    if (!editContractor.name.trim()) {
      return;
    }

    setOperationLoading(true);
    try {
      // Сначала обновляем основную информацию контрагента
      const updatedContractor = await contractorService.updateContractor(editingContractorData!.id, {
        name: editContractor.name,
        address: editContractor.address || undefined
      });
      
      // Удаляем старые контакты
      for (const contact of editingContractorData!.contacts) {
        await contractorService.deleteContact(contact.id);
      }
      
      // Добавляем новые контакты
      const newContacts: ContractorContact[] = [];
      for (const contactData of editContractor.contacts) {
        if (contactData.employeeName.trim()) {
          const newContact = await contractorService.addContact(editingContractorData!.id, contactData);
          newContacts.push(newContact);
        }
      }
      
      // Обновляем контрагента с новыми контактами
      const finalContractor = { ...updatedContractor, contacts: newContacts };
      
      setContractors(prev => prev.map(c => c.id === editingContractorData!.id ? finalContractor : c));
      
      // НЕ сбрасываем форму и НЕ возвращаемся к списку
      console.log('Контрагент успешно обновлен');
    } catch (error) {
      console.error('Ошибка обновления контрагента:', error);
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
      } catch (error) {
        console.error('Ошибка удаления контрагента:', error);
      } finally {
        setOperationLoading(false);
      }
    }
  };

  // Добавление объекта квалификации
  const handleAddQualificationObject = async (objectData: CreateQualificationObjectData) => {
    setOperationLoading(true);
    try {
      const addedObject = await qualificationObjectService.addQualificationObject(objectData);
      setQualificationObjects(prev => [...prev, addedObject]);
      setShowAddQualificationForm(false);
    } catch (error) {
      console.error('Ошибка добавления объекта квалификации:', error);
    } finally {
      setOperationLoading(false);
    }
  };

  // Редактирование объекта квалификации
  const handleEditQualificationObject = (obj: QualificationObject) => {
    setEditingQualificationObject(obj);
    setShowAddQualificationForm(true);
  };

  // Сохранение изменений объекта квалификации
  const handleSaveQualificationObject = async (objectData: CreateQualificationObjectData) => {
    setOperationLoading(true);
    try {
      if (editingQualificationObject) {
        // Обновляем существующий объект
        const updatedObject = await qualificationObjectService.updateQualificationObject(
          editingQualificationObject.id,
          objectData
        );
        setQualificationObjects(prev => prev.map(obj => 
          obj.id === editingQualificationObject.id ? updatedObject : obj
        ));
      } else {
        // Добавляем новый объект
        const addedObject = await qualificationObjectService.addQualificationObject(objectData);
        setQualificationObjects(prev => [...prev, addedObject]);
      }
      setShowAddQualificationForm(false);
      setEditingQualificationObject(null);
    } catch (error) {
      console.error('Ошибка сохранения объекта квалификации:', error);
    } finally {
      setOperationLoading(false);
    }
  };
  // Удаление объекта квалификации
  const handleDeleteQualificationObject = async (objectId: string) => {
    if (confirm('Вы уверены, что хотите удалить этот объект квалификации?')) {
      setOperationLoading(true);
      try {
        await qualificationObjectService.deleteQualificationObject(objectId);
        setQualificationObjects(prev => prev.filter(obj => obj.id !== objectId));
      } catch (error) {
        console.error('Ошибка удаления объекта квалификации:', error);
      } finally {
        setOperationLoading(false);
      }
    }
  };

  // Просмотр контрагента
  const handleViewContractor = (contractor: Contractor) => {
    setViewingContractor(contractor);
    // Загружаем объекты квалификации для просматриваемого контрагента
    loadQualificationObjects(contractor.id);
  };

  // Управление контактами в форме добавления
  const addNewContact = (isEdit = false) => {
    if (isEdit) {
      setEditContractor(prev => ({
        ...prev,
        contacts: [...prev.contacts, { employeeName: '', phone: '', comment: '' }]
      }));
    } else {
      setNewContractor(prev => ({
        ...prev,
        contacts: [...prev.contacts, { employeeName: '', phone: '', comment: '' }]
      }));
    }
  };

  const updateNewContact = (index: number, field: keyof ContractorContact, value: string, isEdit = false) => {
    if (isEdit) {
      setEditContractor(prev => ({
        ...prev,
        contacts: prev.contacts.map((contact, i) => 
          i === index ? { ...contact, [field]: value } : contact
        )
      }));
    } else {
      setNewContractor(prev => ({
        ...prev,
        contacts: prev.contacts.map((contact, i) => 
          i === index ? { ...contact, [field]: value } : contact
        )
      }));
    }
  };

  const removeNewContact = (index: number, isEdit = false) => {
    if (isEdit) {
      setEditContractor(prev => ({
        ...prev,
        contacts: prev.contacts.filter((_, i) => i !== index)
      }));
    } else {
      setNewContractor(prev => ({
        ...prev,
        contacts: prev.contacts.filter((_, i) => i !== index)
      }));
    }
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

  // Функция для рендеринга формы (добавление/редактирование)
  function renderContractorForm(isEdit: boolean) {
    const formData = isEdit ? editContractor : newContractor;
    const setFormData = isEdit ? setEditContractor : setNewContractor;
    const title = isEdit ? 'Редактировать контрагента' : 'Добавить контрагента';
    const submitText = isEdit ? (operationLoading ? 'Сохранение...' : 'Сохранить') : (operationLoading ? 'Добавление...' : 'Добавить');
    const onSubmit = isEdit ? handleSaveEdit : handleAddContractor;
    const onCancel = isEdit ? () => {
      setShowEditForm(false);
      setEditingContractorData(null);
      setEditContractor({ name: '', address: '', contacts: [] });
      setQualificationObjects([]);
      setFilteredQualificationObjects([]);
      setQualificationSearchTerm('');
    } : () => setShowAddForm(false);

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onCancel}
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
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
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
                onClick={() => addNewContact(isEdit)}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors flex items-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>Добавить контакт</span>
              </button>
            </div>

            {formData.contacts.length === 0 ? (
              <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                <p className="text-sm">Контакты не добавлены</p>
                <p className="text-xs mt-1">Нажмите "Добавить контакт" для добавления</p>
              </div>
            ) : (
              <div className="space-y-3">
                {formData.contacts.map((contact, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Сотрудник *</label>
                        <input
                          type="text"
                          value={contact.employeeName}
                          onChange={(e) => updateNewContact(index, 'employeeName', e.target.value, isEdit)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="ФИО сотрудника"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Телефон</label>
                        <input
                          type="tel"
                          value={contact.phone}
                          onChange={(e) => updateNewContact(index, 'phone', e.target.value, isEdit)}
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
                            onChange={(e) => updateNewContact(index, 'comment', e.target.value, isEdit)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Должность, примечания"
                          />
                        </div>
                        <button
                          onClick={() => removeNewContact(index, isEdit)}
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
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={onSubmit}
            disabled={operationLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {submitText}
          </button>
        </div>
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
          {(showAddForm || showEditForm) && (
            <button
              onClick={() => {
                if (showAddForm) {
                  setShowAddForm(false);
                } else if (showEditForm) {
                  setShowEditForm(false);
                  setEditingContractorData(null);
                  setEditContractor({ name: '', address: '', contacts: [] });
                  setQualificationObjects([]);
                  setFilteredQualificationObjects([]);
                  setQualificationSearchTerm('');
                  setShowAddQualificationForm(false);
                  setEditingQualificationObject(null);
                }
              }}
              className="text-gray-600 hover:text-gray-900 transition-colors flex items-center space-x-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Назад к справочнику</span>
            </button>
          )}
          <Building2 className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Справочник контрагентов</h1>
        </div>
        {!showAddForm && !showEditForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить контрагента</span>
          </button>
        )}
      </div>

      {/* Search */}
      {!showAddForm && !showEditForm && (
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
      )}

      {/* Add Contractor Form */}
      {showAddForm && (
        <div className="space-y-6">
          {renderContractorForm(false)}
          {/* Объекты квалификации для нового контрагента будут доступны после создания */}
        </div>
      )}

      {/* Edit Contractor Form */}
      {showEditForm && editingContractorData && (
        <div className="space-y-6">
          {renderContractorForm(true)}
          
          {/* Объекты квалификации для редактируемого контрагента */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Объекты квалификации</h3>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAddQualificationForm(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Добавить объект</span>
                </button>
                <button
                  onClick={() => {
                    // Сохраняем изменения без возврата к списку
                    console.log('Сохранение изменений объектов квалификации');
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Сохранить</span>
                </button>
              </div>
            </div>

            {/* Add Qualification Object Form */}
            {showAddQualificationForm && (
              <div className="mb-6">
                <QualificationObjectForm
                  contractorId={editingContractorData.id}
                  contractorAddress={editingContractorData.address}
                  onSubmit={handleSaveQualificationObject}
                  onCancel={() => {
                    setShowAddQualificationForm(false);
                    setEditingQualificationObject(null);
                  }}
                  loading={operationLoading}
                  editingObject={editingQualificationObject}
                />
              </div>
            )}

            {/* Qualification Objects Table */}
            <QualificationObjectsTable
              objects={filteredQualificationObjects}
              onAdd={() => setShowAddQualificationForm(true)}
              onEdit={handleEditQualificationObject}
              onDelete={handleDeleteQualificationObject}
              onShowOnMap={(obj) => {
                // TODO: Implement map functionality for objects
                console.log('Show on map:', obj);
              }}
              loading={loading}
              hideAddButton={true}
            />
          </div>
        </div>
      )}

      {/* Contractors Table */}
      {!showAddForm && !showEditForm && (
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
                      <div>
                        <div className="text-sm font-medium text-gray-900">{contractor.name}</div>
                        <div className="text-xs text-gray-500">
                          Создан: {contractor.createdAt.toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
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
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Не указан</span>
                        )}
                      </div>
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
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleViewContractor(contractor)}
                          disabled={operationLoading}
                          className="text-blue-600 hover:text-blue-900"
                          title="Просмотр"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
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
      )}

      {/* View Contractor Modal */}
      {viewingContractor && (
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Просмотр контрагента</h2>
            <button
              onClick={() => {
                setViewingContractor(null);
                setQualificationObjects([]);
                setFilteredQualificationObjects([]);
                setQualificationSearchTerm('');
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Основная информация контрагента */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Основная информация</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500">Наименование</label>
                  <p className="text-sm font-medium text-gray-900">{viewingContractor.name}</p>
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Адрес</label>
                  <p className="text-sm text-gray-900">
                    {viewingContractor.address || 'Не указан'}
                  </p>
                  {viewingContractor.latitude && viewingContractor.longitude && (
                    <div className="flex items-center space-x-1 mt-1">
                      <MapPin className="w-3 h-3 text-green-600" />
                      <span className="text-xs text-green-600">
                        Координаты: {viewingContractor.latitude.toFixed(6)}, {viewingContractor.longitude.toFixed(6)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Контакты</h3>
              {viewingContractor.contacts.length > 0 ? (
                <div className="space-y-3">
                  {viewingContractor.contacts.map((contact) => (
                    <div key={contact.id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center space-x-2 mb-1">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{contact.employeeName}</span>
                      </div>
                      {contact.phone && (
                        <div className="flex items-center space-x-2 mb-1">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{contact.phone}</span>
                        </div>
                      )}
                      {contact.comment && (
                        <div className="flex items-center space-x-2">
                          <MessageSquare className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-500 text-sm">{contact.comment}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                  <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Контакты не добавлены</p>
                </div>
              )}
            </div>
          </div>

          {/* Объекты квалификации для просматриваемого контрагента */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Объекты квалификации</h3>
            
            <QualificationObjectsTable
              objects={filteredQualificationObjects}
              onAdd={() => {}} // Отключаем добавление в режиме просмотра
              onEdit={() => {}} // Отключаем редактирование в режиме просмотра
              onDelete={() => {}} // Отключаем удаление в режиме просмотра
              onShowOnMap={(obj) => {
                console.log('Show on map:', obj);
              }}
              loading={loading}
              hideAddButton={true}
            />
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={() => {
                setViewingContractor(null);
                setQualificationObjects([]);
                setFilteredQualificationObjects([]);
                setQualificationSearchTerm('');
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
};