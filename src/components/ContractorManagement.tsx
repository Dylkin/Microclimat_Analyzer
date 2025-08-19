import React, { useState, useEffect } from 'react';
import { Contractor, ContactPerson } from '../types/Contractor';
import { contractorService } from '../services/contractorService';
import { 
  Building2, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  AlertCircle,
  MapPin,
  Phone,
  User,
  MessageSquare,
  Map
} from 'lucide-react';

export const ContractorManagement: React.FC = () => {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContactPerson, setEditingContactPerson] = useState<{ contractorId: string; contactId: string | null }>({ contractorId: '', contactId: null });
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contactPersons: [] as ContactPerson[]
  });
  const [contactPersonForm, setContactPersonForm] = useState({
    name: '',
    phone: '',
    comment: ''
  });
  const [error, setError] = useState('');
  const [isGeocoding, setIsGeocoding] = useState<string | null>(null);

  useEffect(() => {
    loadContractors();
  }, []);

  const loadContractors = async () => {
    try {
      const contractorsData = await contractorService.getAllContractors();
      setContractors(contractorsData);
    } catch (error) {
      console.error('Error loading contractors:', error);
      setError('Ошибка загрузки контрагентов');
    }
  };

  const handleAddContractor = async () => {
    setError('');
    
    if (!formData.name || !formData.address) {
      setError('Название и адрес обязательны для заполнения');
      return;
    }

    if (formData.contactPersons.length === 0) {
      setError('Добавьте хотя бы одно контактное лицо');
      return;
    }

    try {
      const newContractor = await contractorService.createContractor(formData);
      setContractors(prev => [...prev, newContractor]);
      setShowAddForm(false);
      setFormData({ name: '', address: '', contactPersons: [] });
    } catch (error) {
      console.error('Error adding contractor:', error);
      setError('Ошибка добавления контрагента');
    }
  };

  const handleUpdateContractor = async () => {
    if (!editingContractor) return;
    
    setError('');
    
    if (!editingContractor.name || !editingContractor.address) {
      setError('Название и адрес обязательны для заполнения');
      return;
    }

    try {
      await contractorService.updateContractor(editingContractor.id, editingContractor);
      setContractors(prev => prev.map(c => 
        c.id === editingContractor.id ? editingContractor : c
      ));
      setEditingContractor(null);
    } catch (error) {
      console.error('Error updating contractor:', error);
      setError('Ошибка обновления контрагента');
    }
  };

  const handleDeleteContractor = async (contractorId: string) => {
    if (confirm('Вы уверены, что хотите удалить этого контрагента?')) {
      try {
        await contractorService.deleteContractor(contractorId);
        setContractors(prev => prev.filter(c => c.id !== contractorId));
      } catch (error) {
        console.error('Error deleting contractor:', error);
        setError('Ошибка удаления контрагента');
      }
    }
  };

  const handleGeocodeAddress = async (contractorId: string, address: string) => {
    setIsGeocoding(contractorId);
    try {
      const coordinates = await contractorService.geocodeAddress(address);
      if (coordinates) {
        const updatedContractor = contractors.find(c => c.id === contractorId);
        if (updatedContractor) {
          const updated = { ...updatedContractor, coordinates };
          await contractorService.updateContractor(contractorId, updated);
          setContractors(prev => prev.map(c => 
            c.id === contractorId ? updated : c
          ));
        }
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
      setError('Ошибка геокодирования адреса');
    } finally {
      setIsGeocoding(null);
    }
  };

  // Управление контактными лицами
  const handleAddContactPerson = (contractorId: string) => {
    if (!contactPersonForm.name || !contactPersonForm.phone) {
      setError('Имя и телефон контактного лица обязательны');
      return;
    }

    const newContactPerson: ContactPerson = {
      id: Date.now().toString(),
      name: contactPersonForm.name,
      phone: contactPersonForm.phone,
      comment: contactPersonForm.comment
    };

    if (editingContractor && editingContractor.id === contractorId) {
      setEditingContractor(prev => prev ? {
        ...prev,
        contactPersons: [...prev.contactPersons, newContactPerson]
      } : null);
    } else if (showAddForm) {
      setFormData(prev => ({
        ...prev,
        contactPersons: [...prev.contactPersons, newContactPerson]
      }));
    }

    setContactPersonForm({ name: '', phone: '', comment: '' });
    setEditingContactPerson({ contractorId: '', contactId: null });
  };

  const handleUpdateContactPerson = (contractorId: string, contactId: string) => {
    if (!contactPersonForm.name || !contactPersonForm.phone) {
      setError('Имя и телефон контактного лица обязательны');
      return;
    }

    const updatedContact: ContactPerson = {
      id: contactId,
      name: contactPersonForm.name,
      phone: contactPersonForm.phone,
      comment: contactPersonForm.comment
    };

    if (editingContractor && editingContractor.id === contractorId) {
      setEditingContractor(prev => prev ? {
        ...prev,
        contactPersons: prev.contactPersons.map(cp => 
          cp.id === contactId ? updatedContact : cp
        )
      } : null);
    } else if (showAddForm) {
      setFormData(prev => ({
        ...prev,
        contactPersons: prev.contactPersons.map(cp => 
          cp.id === contactId ? updatedContact : cp
        )
      }));
    }

    setContactPersonForm({ name: '', phone: '', comment: '' });
    setEditingContactPerson({ contractorId: '', contactId: null });
  };

  const handleDeleteContactPerson = (contractorId: string, contactId: string) => {
    if (editingContractor && editingContractor.id === contractorId) {
      setEditingContractor(prev => prev ? {
        ...prev,
        contactPersons: prev.contactPersons.filter(cp => cp.id !== contactId)
      } : null);
    } else if (showAddForm) {
      setFormData(prev => ({
        ...prev,
        contactPersons: prev.contactPersons.filter(cp => cp.id !== contactId)
      }));
    }
  };

  const handleStartEditingContactPerson = (contractorId: string, contact: ContactPerson) => {
    setEditingContactPerson({ contractorId, contactId: contact.id });
    setContactPersonForm({
      name: contact.name,
      phone: contact.phone,
      comment: contact.comment || ''
    });
  };

  const handleCancelEditingContactPerson = () => {
    setEditingContactPerson({ contractorId: '', contactId: null });
    setContactPersonForm({ name: '', phone: '', comment: '' });
  };

  return (
    <div className="space-y-6">
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

      {error && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Форма добавления контрагента */}
      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Добавить нового контрагента</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Наименование *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Адрес *</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => handleGeocodeAddress('new', formData.address)}
                    disabled={!formData.address || isGeocoding === 'new'}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    title="Геокодировать адрес"
                  >
                    {isGeocoding === 'new' ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Map className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Контактные лица */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">Контактные лица *</label>
                <button
                  type="button"
                  onClick={() => setEditingContactPerson({ contractorId: 'new', contactId: null })}
                  className="text-indigo-600 hover:text-indigo-800 transition-colors flex items-center space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Добавить</span>
                </button>
              </div>

              {/* Список контактных лиц */}
              {formData.contactPersons.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {formData.contactPersons.map((contact) => (
                    <div key={contact.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{contact.name}</div>
                        <div className="text-sm text-gray-600">{contact.phone}</div>
                        {contact.comment && (
                          <div className="text-xs text-gray-500">{contact.comment}</div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleStartEditingContactPerson('new', contact)}
                          className="text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteContactPerson('new', contact.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg mb-4">
                  <p className="text-sm">Контактные лица не добавлены</p>
                </div>
              )}

              {/* Форма добавления/редактирования контактного лица */}
              {editingContactPerson.contractorId === 'new' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-3">
                    {editingContactPerson.contactId ? 'Редактировать контактное лицо' : 'Добавить контактное лицо'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-blue-700 mb-1">Имя *</label>
                      <input
                        type="text"
                        value={contactPersonForm.name}
                        onChange={(e) => setContactPersonForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="ФИО контактного лица"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-blue-700 mb-1">Телефон *</label>
                      <input
                        type="tel"
                        value={contactPersonForm.phone}
                        onChange={(e) => setContactPersonForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="+7 (xxx) xxx-xx-xx"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-blue-700 mb-1">Комментарий</label>
                      <input
                        type="text"
                        value={contactPersonForm.comment}
                        onChange={(e) => setContactPersonForm(prev => ({ ...prev, comment: e.target.value }))}
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Должность, примечания"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-3">
                    <button
                      type="button"
                      onClick={handleCancelEditingContactPerson}
                      className="px-3 py-1 text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (editingContactPerson.contactId) {
                          handleUpdateContactPerson('new', editingContactPerson.contactId);
                        } else {
                          handleAddContactPerson('new');
                        }
                      }}
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {editingContactPerson.contactId ? 'Сохранить' : 'Добавить'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => {
                setShowAddForm(false);
                setFormData({ name: '', address: '', contactPersons: [] });
                setEditingContactPerson({ contractorId: '', contactId: null });
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleAddContractor}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Создать</span>
            </button>
          </div>
        </div>
      )}

      {/* Список контрагентов */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Наименование
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Адрес
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Контактные лица
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {contractors.map((contractor) => (
              <tr key={contractor.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingContractor?.id === contractor.id ? (
                    <input
                      type="text"
                      value={editingContractor.name}
                      onChange={(e) => setEditingContractor({ ...editingContractor, name: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  ) : (
                    <div className="text-sm font-medium text-gray-900">{contractor.name}</div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingContractor?.id === contractor.id ? (
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={editingContractor.address}
                        onChange={(e) => setEditingContractor({ ...editingContractor, address: e.target.value })}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleGeocodeAddress(contractor.id, editingContractor.address)}
                        disabled={isGeocoding === contractor.id}
                        className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                        title="Геокодировать адрес"
                      >
                        {isGeocoding === contractor.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        ) : (
                          <Map className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm text-gray-900">{contractor.address}</div>
                      {contractor.coordinates && (
                        <div className="text-xs text-green-600 flex items-center space-x-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          <span>Геокодирован</span>
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingContractor?.id === contractor.id ? (
                    <div className="space-y-2">
                      {editingContractor.contactPersons.map((contact) => (
                        <div key={contact.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <div className="text-sm">
                            <div className="font-medium">{contact.name}</div>
                            <div className="text-gray-600">{contact.phone}</div>
                            {contact.comment && (
                              <div className="text-xs text-gray-500">{contact.comment}</div>
                            )}
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleStartEditingContactPerson(contractor.id, contact)}
                              className="text-indigo-600 hover:text-indigo-800 transition-colors"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteContactPerson(contractor.id, contact.id)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      <button
                        type="button"
                        onClick={() => setEditingContactPerson({ contractorId: contractor.id, contactId: null })}
                        className="text-indigo-600 hover:text-indigo-800 transition-colors flex items-center space-x-1 text-sm"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Добавить контакт</span>
                      </button>

                      {/* Форма редактирования контактного лица */}
                      {editingContactPerson.contractorId === contractor.id && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                          <div className="grid grid-cols-1 gap-2">
                            <input
                              type="text"
                              value={contactPersonForm.name}
                              onChange={(e) => setContactPersonForm(prev => ({ ...prev, name: e.target.value }))}
                              className="px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              placeholder="Имя *"
                            />
                            <input
                              type="tel"
                              value={contactPersonForm.phone}
                              onChange={(e) => setContactPersonForm(prev => ({ ...prev, phone: e.target.value }))}
                              className="px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              placeholder="Телефон *"
                            />
                            <input
                              type="text"
                              value={contactPersonForm.comment}
                              onChange={(e) => setContactPersonForm(prev => ({ ...prev, comment: e.target.value }))}
                              className="px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              placeholder="Комментарий"
                            />
                          </div>
                          <div className="flex justify-end space-x-2 mt-2">
                            <button
                              type="button"
                              onClick={handleCancelEditingContactPerson}
                              className="px-2 py-1 text-blue-600 hover:text-blue-800 transition-colors text-sm"
                            >
                              Отмена
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (editingContactPerson.contactId) {
                                  handleUpdateContactPerson(contractor.id, editingContactPerson.contactId);
                                } else {
                                  handleAddContactPerson(contractor.id);
                                }
                              }}
                              className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                            >
                              {editingContactPerson.contactId ? 'Сохранить' : 'Добавить'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {contractor.contactPersons.map((contact) => (
                        <div key={contact.id} className="text-sm">
                          <div className="font-medium text-gray-900">{contact.name}</div>
                          <div className="text-gray-600">{contact.phone}</div>
                          {contact.comment && (
                            <div className="text-xs text-gray-500">{contact.comment}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {editingContractor?.id === contractor.id ? (
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={handleUpdateContractor}
                        className="text-green-600 hover:text-green-900"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingContractor(null)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setEditingContractor(contractor)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Редактировать контрагента"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteContractor(contractor.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Удалить контрагента"
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
    </div>
  );
};