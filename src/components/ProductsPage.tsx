import React, { useState, useEffect } from 'react';
import { 
  Wrench, Plus, Edit2, Trash2, Search, X, Save, 
  FolderOpen, Package, AlertTriangle, Loader, ChevronDown, ChevronRight, Eye, Globe, Building2
} from 'lucide-react';
import { 
  EquipmentSection, EquipmentCard, 
  CreateEquipmentSectionData, CreateEquipmentCardData 
} from '../types/EquipmentSections';
import { equipmentSectionsService } from '../utils/equipmentSectionsService';
import { contractorService } from '../utils/contractorService';
import { Contractor } from '../types/Contractor';
import ProductCardPage from './ProductCardPage';

interface ProductsPageProps {
  onPageChange?: (page: string, data?: any) => void;
}

const ProductsPage: React.FC<ProductsPageProps> = ({ onPageChange }) => {
  const [sections, setSections] = useState<EquipmentSection[]>([]);
  const [cards, setCards] = useState<EquipmentCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<EquipmentCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);
  
  // Поиск
  const [sectionSearchTerm, setSectionSearchTerm] = useState('');
  const [cardSearchTerm, setCardSearchTerm] = useState('');
  
  // UI состояние
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [viewingCardId, setViewingCardId] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<EquipmentSection | null>(null);
  const [editingCard, setEditingCard] = useState<EquipmentCard | null>(null);
  
  // Формы
  const [sectionForm, setSectionForm] = useState<CreateEquipmentSectionData>({
    name: '',
    description: '',
    manufacturers: [],
    website: '',
    supplierIds: []
  });

  // Данные для выбора поставщиков
  const [suppliers, setSuppliers] = useState<Contractor[]>([]);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  
  const [cardForm, setCardForm] = useState<CreateEquipmentCardData>({
    sectionId: '',
    name: '',
    manufacturer: '',
    series: '',
    channelsCount: undefined,
    dosingVolume: '',
    volumeStep: '',
    dosingAccuracy: '',
    reproducibility: '',
    autoclavable: undefined,
    specifications: {},
    externalUrl: ''
  });

  // Загрузка данных
  const loadSections = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await equipmentSectionsService.getSections(sectionSearchTerm || undefined);
      setSections(data);
    } catch (err) {
      console.error('Ошибка загрузки разделов:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const loadCards = async (sectionId?: string) => {
    try {
      const data = await equipmentSectionsService.getCards(
        cardSearchTerm || undefined,
        sectionId || undefined
      );
      setCards(data);
      setFilteredCards(data);
    } catch (err) {
      console.error('Ошибка загрузки карточек:', err);
    }
  };

  useEffect(() => {
    loadSections();
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const allContractors = await contractorService.getAllContractors();
      // Фильтруем только поставщиков (с ролью 'supplier')
      const suppliersList = allContractors.filter(c => 
        c.role && Array.isArray(c.role) && c.role.includes('supplier')
      );
      setSuppliers(suppliersList);
    } catch (err) {
      console.error('Ошибка загрузки поставщиков:', err);
    }
  };

  useEffect(() => {
    loadCards(selectedSectionId || undefined);
  }, [selectedSectionId, cardSearchTerm]);

  // Поиск с задержкой
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadSections();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [sectionSearchTerm]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadCards(selectedSectionId || undefined);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [cardSearchTerm]);

  // Управление разделами
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
        if (selectedSectionId === sectionId) {
          setSelectedSectionId(null);
        }
      } else {
        newSet.add(sectionId);
        setSelectedSectionId(sectionId);
      }
      return newSet;
    });
  };

  const handleAddSection = () => {
    setSectionForm({ name: '', description: '', manufacturers: [], website: '', supplierIds: [] });
    setEditingSection(null);
    setShowSectionForm(true);
  };

  const handleEditSection = (section: EquipmentSection) => {
    setSectionForm({
      name: section.name,
      description: section.description || '',
      manufacturers: section.manufacturers || [],
      website: section.website || '',
      supplierIds: section.supplierIds || []
    });
    setEditingSection(section);
    setShowSectionForm(true);
  };

  const handleSaveSection = async () => {
    if (!sectionForm.name.trim()) {
      alert('Наименование раздела обязательно');
      return;
    }

    setOperationLoading(true);
    try {
      if (editingSection) {
        await equipmentSectionsService.updateSection(editingSection.id, sectionForm);
      } else {
        await equipmentSectionsService.createSection(sectionForm);
      }
      
      await loadSections();
      setShowSectionForm(false);
      setEditingSection(null);
      setSectionForm({ name: '', description: '', manufacturers: [], website: '', supplierIds: [] });
      setSupplierSearchTerm('');
      setShowSupplierDropdown(false);
      alert(`Раздел ${editingSection ? 'обновлен' : 'создан'} успешно`);
    } catch (err) {
      alert(`Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот раздел? Все карточки в нем также будут удалены.')) {
      return;
    }

    setOperationLoading(true);
    try {
      await equipmentSectionsService.deleteSection(sectionId);
      await loadSections();
      if (selectedSectionId === sectionId) {
        setSelectedSectionId(null);
      }
      alert('Раздел успешно удален');
    } catch (err) {
      alert(`Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Управление карточками
  const handleAddCard = (sectionId: string) => {
    setCardForm({
      sectionId,
      name: '',
      manufacturer: '',
      series: '',
      channelsCount: undefined,
      dosingVolume: '',
      volumeStep: '',
      dosingAccuracy: '',
      reproducibility: '',
      autoclavable: undefined,
      specifications: {},
      externalUrl: ''
    });
    setEditingCard(null);
    setShowCardForm(true);
  };

  const handleEditCard = (card: EquipmentCard) => {
    // Открываем карточку на отдельной странице в режиме редактирования
    setViewingCardId(card.id);
  };

  const handleSaveCard = async () => {
    if (!cardForm.name.trim()) {
      alert('Наименование карточки обязательно');
      return;
    }

    if (!cardForm.sectionId) {
      alert('Необходимо выбрать раздел');
      return;
    }

    setOperationLoading(true);
    try {
      if (editingCard) {
        await equipmentSectionsService.updateCard(editingCard.id, cardForm);
      } else {
        await equipmentSectionsService.createCard(cardForm);
      }
      
      await loadCards(selectedSectionId || undefined);
      setShowCardForm(false);
      setEditingCard(null);
      setCardForm({
        sectionId: '',
        name: '',
        manufacturer: '',
        series: '',
        channelsCount: undefined,
        dosingVolume: '',
        volumeStep: '',
        dosingAccuracy: '',
        reproducibility: '',
        autoclavable: undefined,
        specifications: {},
        externalUrl: ''
      });
      alert(`Карточка ${editingCard ? 'обновлена' : 'создана'} успешно`);
    } catch (err) {
      alert(`Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту карточку?')) {
      return;
    }

    setOperationLoading(true);
    try {
      await equipmentSectionsService.deleteCard(cardId);
      await loadCards(selectedSectionId || undefined);
      alert('Карточка успешно удалена');
    } catch (err) {
      alert(`Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Фильтрация карточек по выбранному разделу
  const displayedCards = selectedSectionId
    ? filteredCards.filter(card => card.sectionId === selectedSectionId)
    : filteredCards;

  // Если открыта карточка для просмотра/редактирования
  if (viewingCardId) {
    const isEditMode = editingCard?.id === viewingCardId;
    return (
      <ProductCardPage 
        cardId={viewingCardId} 
        initialEditMode={isEditMode}
        onBack={() => {
          setViewingCardId(null);
          setEditingCard(null);
          loadCards(selectedSectionId || undefined);
        }} 
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Wrench className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Товары</h1>
        </div>
        <button
          onClick={handleAddSection}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить раздел</span>
        </button>
      </div>

      {/* Ошибка */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Ошибка</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Поиск разделов */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={sectionSearchTerm}
            onChange={(e) => setSectionSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Поиск по наименованию раздела..."
          />
        </div>
      </div>

      {/* Форма раздела */}
      {showSectionForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingSection ? 'Редактировать раздел' : 'Добавить раздел'}
            </h2>
            <button
              onClick={() => {
                setShowSectionForm(false);
                setEditingSection(null);
                setSectionForm({ name: '', description: '', manufacturers: [], website: '', supplierIds: [] });
      setSupplierSearchTerm('');
      setShowSupplierDropdown(false);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Наименование *
              </label>
              <input
                type="text"
                value={sectionForm.name}
                onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите наименование раздела"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Описание
              </label>
              <textarea
                value={sectionForm.description}
                onChange={(e) => setSectionForm({ ...sectionForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                rows={3}
                placeholder="Введите описание раздела"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Производитель
              </label>
              <div className="space-y-2">
                {sectionForm.manufacturers?.map((manufacturer, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={manufacturer}
                      onChange={(e) => {
                        const newManufacturers = [...(sectionForm.manufacturers || [])];
                        newManufacturers[index] = e.target.value;
                        setSectionForm({ ...sectionForm, manufacturers: newManufacturers });
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Введите производителя"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newManufacturers = [...(sectionForm.manufacturers || [])];
                        newManufacturers.splice(index, 1);
                        setSectionForm({ ...sectionForm, manufacturers: newManufacturers });
                      }}
                      className="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setSectionForm({
                      ...sectionForm,
                      manufacturers: [...(sectionForm.manufacturers || []), '']
                    });
                  }}
                  className="flex items-center space-x-2 text-sm text-indigo-600 hover:text-indigo-800"
                >
                  <Plus className="w-4 h-4" />
                  <span>Добавить производителя</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Globe className="w-4 h-4 inline mr-1" />
                Сайт
              </label>
              <input
                type="url"
                value={sectionForm.website}
                onChange={(e) => setSectionForm({ ...sectionForm, website: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="https://example.com"
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Building2 className="w-4 h-4 inline mr-1" />
                Поставщик
              </label>
              <div className="space-y-2">
                {/* Выбранные поставщики */}
                {sectionForm.supplierIds?.map((supplierId) => {
                  const supplier = suppliers.find(s => s.id === supplierId);
                  if (!supplier) return null;
                  return (
                    <div key={supplierId} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                      <span className="text-sm text-gray-900">{supplier.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const newSupplierIds = (sectionForm.supplierIds || []).filter(id => id !== supplierId);
                          setSectionForm({ ...sectionForm, supplierIds: newSupplierIds });
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}

                {/* Поле поиска и выпадающий список */}
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={supplierSearchTerm}
                      onChange={(e) => {
                        setSupplierSearchTerm(e.target.value);
                        setShowSupplierDropdown(true);
                      }}
                      onFocus={() => setShowSupplierDropdown(true)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Поиск поставщика..."
                    />
                  </div>

                  {/* Выпадающий список поставщиков */}
                  {showSupplierDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowSupplierDropdown(false)}
                      />
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                        {suppliers
                          .filter(supplier => {
                            const searchLower = supplierSearchTerm.toLowerCase();
                            return supplier.name.toLowerCase().includes(searchLower) &&
                                   !sectionForm.supplierIds?.includes(supplier.id);
                          })
                          .map((supplier) => (
                            <button
                              key={supplier.id}
                              type="button"
                              onClick={() => {
                                const newSupplierIds = [...(sectionForm.supplierIds || []), supplier.id];
                                setSectionForm({ ...sectionForm, supplierIds: newSupplierIds });
                                setSupplierSearchTerm('');
                                setShowSupplierDropdown(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-indigo-50 transition-colors"
                            >
                              <div className="font-medium text-gray-900">{supplier.name}</div>
                              {supplier.address && (
                                <div className="text-xs text-gray-500">{supplier.address}</div>
                              )}
                            </button>
                          ))}
                        {suppliers.filter(supplier => {
                          const searchLower = supplierSearchTerm.toLowerCase();
                          return supplier.name.toLowerCase().includes(searchLower) &&
                                 !sectionForm.supplierIds?.includes(supplier.id);
                        }).length === 0 && (
                          <div className="px-4 py-2 text-sm text-gray-500">
                            {supplierSearchTerm ? 'Поставщики не найдены' : 'Все поставщики уже добавлены'}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => {
                setShowSectionForm(false);
                setEditingSection(null);
                setSectionForm({ name: '', description: '', manufacturers: [], website: '', supplierIds: [] });
                setSupplierSearchTerm('');
                setShowSupplierDropdown(false);
              }}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSaveSection}
              disabled={operationLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {operationLoading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      )}

      {/* Список разделов */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <Loader className="animate-spin w-6 h-6 mx-auto text-indigo-600" />
            <p className="mt-2 text-gray-600">Загрузка разделов...</p>
          </div>
        ) : sections.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Разделы не найдены</p>
            {sectionSearchTerm && (
              <p className="text-sm mt-1">Попробуйте изменить поисковый запрос</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {sections.map((section) => (
              <div key={section.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {expandedSections.has(section.id) ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </button>
                    <FolderOpen className="w-5 h-5 text-indigo-600" />
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{section.name}</h3>
                      {section.description && (
                        <p className="text-sm text-gray-500 mt-1">{section.description}</p>
                      )}
                      {(section.manufacturers && section.manufacturers.length > 0) && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {section.manufacturers.map((manufacturer, idx) => (
                            <span key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {manufacturer}
                            </span>
                          ))}
                        </div>
                      )}
                      {section.website && (
                        <a
                          href={section.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-600 hover:text-indigo-800 mt-1 inline-flex items-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Globe className="w-3 h-3 mr-1" />
                          {section.website.length > 30 ? section.website.substring(0, 30) + '...' : section.website}
                        </a>
                      )}
                      {(section.supplierIds && section.supplierIds.length > 0) && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {section.supplierIds.map((supplierId) => {
                            const supplier = suppliers.find(s => s.id === supplierId);
                            return supplier ? (
                              <span key={supplierId} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded flex items-center">
                                <Building2 className="w-3 h-3 mr-1" />
                                {supplier.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Карточек: {section.cardsCount}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditSection(section)}
                      className="text-indigo-600 hover:text-indigo-800"
                      title="Редактировать"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSection(section.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Карточки раздела */}
                {expandedSections.has(section.id) && (
                  <div className="mt-4 ml-8 space-y-4">
                    {/* Поиск карточек */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={cardSearchTerm}
                        onChange={(e) => setCardSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Поиск по наименованию карточки..."
                      />
                    </div>

                    {/* Кнопка добавления карточки */}
                    <button
                      onClick={() => handleAddCard(section.id)}
                      className="flex items-center space-x-2 text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Добавить карточку</span>
                    </button>

                    {/* Список карточек */}
                    {displayedCards
                      .filter(card => card.sectionId === section.id)
                      .map((card) => (
                        <div key={card.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <Package className="w-4 h-4 text-gray-400" />
                                <h4 className="font-medium text-gray-900">{card.name}</h4>
                              </div>
                              {(card.manufacturer || card.series) && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {card.manufacturer} {card.series}
                                </p>
                              )}
                              {card.externalUrl && (
                                <a
                                  href={card.externalUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-indigo-600 hover:text-indigo-800 mt-1 inline-block"
                                  title={card.externalUrl}
                                >
                                  {card.externalUrl.length > 20 ? card.externalUrl.substring(0, 20) + '...' : card.externalUrl} →
                                </a>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <button
                                onClick={() => setViewingCardId(card.id)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Просмотр"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingCard(card);
                                  handleEditCard(card);
                                }}
                                className="text-indigo-600 hover:text-indigo-800"
                                title="Редактировать"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteCard(card.id)}
                                className="text-red-600 hover:text-red-800"
                                title="Удалить"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                    {displayedCards.filter(card => card.sectionId === section.id).length === 0 && (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        {cardSearchTerm ? 'Карточки не найдены' : 'Карточки не добавлены'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Форма карточки */}
      {showCardForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingCard ? 'Редактировать карточку' : 'Добавить карточку'}
            </h2>
            <button
              onClick={() => {
                setShowCardForm(false);
                setEditingCard(null);
                setCardForm({
                  sectionId: '',
                  name: '',
                  manufacturer: '',
                  series: '',
                  channelsCount: undefined,
                  dosingVolume: '',
                  volumeStep: '',
                  dosingAccuracy: '',
                  reproducibility: '',
                  autoclavable: undefined,
                  specifications: {},
                  externalUrl: ''
                });
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Раздел *
              </label>
              <select
                value={cardForm.sectionId}
                onChange={(e) => setCardForm({ ...cardForm, sectionId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={!!editingCard}
              >
                <option value="">Выберите раздел</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Наименование *
              </label>
              <input
                type="text"
                value={cardForm.name}
                onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите наименование карточки"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Производитель
                </label>
                <input
                  type="text"
                  value={cardForm.manufacturer}
                  onChange={(e) => setCardForm({ ...cardForm, manufacturer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Производитель"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Серия
                </label>
                <input
                  type="text"
                  value={cardForm.series}
                  onChange={(e) => setCardForm({ ...cardForm, series: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Серия"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Количество каналов
                </label>
                <input
                  type="number"
                  value={cardForm.channelsCount || ''}
                  onChange={(e) => setCardForm({ ...cardForm, channelsCount: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Количество каналов"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Объем дозирования
                </label>
                <input
                  type="text"
                  value={cardForm.dosingVolume}
                  onChange={(e) => setCardForm({ ...cardForm, dosingVolume: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="например, 0,1-2,5 мкл"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Шаг установки объема дозы
                </label>
                <input
                  type="text"
                  value={cardForm.volumeStep}
                  onChange={(e) => setCardForm({ ...cardForm, volumeStep: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Шаг установки объема"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Точность дозирования
                </label>
                <input
                  type="text"
                  value={cardForm.dosingAccuracy}
                  onChange={(e) => setCardForm({ ...cardForm, dosingAccuracy: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Точность дозирования"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Воспроизводимость
                </label>
                <input
                  type="text"
                  value={cardForm.reproducibility}
                  onChange={(e) => setCardForm({ ...cardForm, reproducibility: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Воспроизводимость"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Автоклавируемость
                </label>
                <select
                  value={cardForm.autoclavable === undefined ? '' : cardForm.autoclavable ? 'true' : 'false'}
                  onChange={(e) => setCardForm({ 
                    ...cardForm, 
                    autoclavable: e.target.value === '' ? undefined : e.target.value === 'true' 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Не указано</option>
                  <option value="true">Да</option>
                  <option value="false">Нет</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ссылка на внешний ресурс
              </label>
              <input
                type="url"
                value={cardForm.externalUrl}
                onChange={(e) => setCardForm({ ...cardForm, externalUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="https://..."
              />
            </div>

          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => {
                setShowCardForm(false);
                setEditingCard(null);
                setCardForm({
                  sectionId: '',
                  name: '',
                  description: '',
                  manufacturer: '',
                  series: '',
      channelsCount: undefined,
      dosingVolume: '',
      volumeStep: '',
      dosingAccuracy: '',
      reproducibility: '',
      autoclavable: undefined,
                  specifications: {},
                  externalUrl: ''
                });
              }}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSaveCard}
              disabled={operationLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {operationLoading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;

