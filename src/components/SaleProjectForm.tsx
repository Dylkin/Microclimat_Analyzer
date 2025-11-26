import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Search } from 'lucide-react';
import { Contractor, ContractorRole } from '../types/Contractor';
import { contractorService } from '../utils/contractorService';
import { CreateProjectData } from '../types/Project';

interface SaleProjectFormProps {
  contractors: Contractor[];
  onSave: (projectData: CreateProjectData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

interface ProjectItem {
  name: string;
  quantity: number;
  declaredPrice: number;
  supplierId?: string;
  supplierPrice?: number;
  description?: string;
}

export const SaleProjectForm: React.FC<SaleProjectFormProps> = ({
  contractors,
  onSave,
  onCancel,
  loading = false
}) => {
  const [contractorId, setContractorId] = useState('');
  const [contractorSearch, setContractorSearch] = useState('');
  const [showContractorDropdown, setShowContractorDropdown] = useState(false);
  const [tenderLink, setTenderLink] = useState('');
  const [tenderDate, setTenderDate] = useState('');
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [supplierSearches, setSupplierSearches] = useState<Record<number, string>>({});
  const [showSupplierDropdowns, setShowSupplierDropdowns] = useState<Record<number, boolean>>({});
  
  const contractorDropdownRef = useRef<HTMLDivElement>(null);
  const supplierDropdownRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Закрытие выпадающих списков при клике вне области
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contractorDropdownRef.current && !contractorDropdownRef.current.contains(event.target as Node)) {
        setShowContractorDropdown(false);
      }
      
      Object.keys(supplierDropdownRefs.current).forEach(index => {
        const ref = supplierDropdownRefs.current[parseInt(index)];
        if (ref && !ref.contains(event.target as Node)) {
          setShowSupplierDropdowns(prev => ({ ...prev, [parseInt(index)]: false }));
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Фильтрация контрагентов для покупателей
  const buyerContractors = contractors.filter(c => 
    !c.role || c.role.length === 0 || c.role.includes('buyer')
  );

  // Фильтрация контрагентов для поставщиков
  const supplierContractors = contractors.filter(c => 
    c.role && c.role.includes('supplier')
  );

  // Фильтрованные контрагенты для поиска покупателя
  const filteredBuyerContractors = buyerContractors.filter(c =>
    c.name.toLowerCase().includes(contractorSearch.toLowerCase())
  );

  // Обработка выбора контрагента
  const handleContractorSelect = (contractor: Contractor) => {
    setContractorId(contractor.id);
    setContractorSearch(contractor.name);
    setShowContractorDropdown(false);
  };

  // Добавление нового контрагента с ролью покупатель
  const handleAddNewContractor = async () => {
    if (!contractorSearch.trim()) return;

    try {
      const newContractor = await contractorService.addContractor({
        name: contractorSearch,
        address: '',
        role: ['buyer'],
        contacts: []
      });
      setContractorId(newContractor.id);
      setShowContractorDropdown(false);
    } catch (error) {
      console.error('Ошибка добавления контрагента:', error);
      alert('Ошибка добавления контрагента');
    }
  };

  // Добавление товара
  const handleAddItem = () => {
    setItems(prev => [...prev, {
      name: '',
      quantity: 1,
      declaredPrice: 0,
      supplierId: undefined,
      supplierPrice: undefined,
      description: ''
    }]);
  };

  // Удаление товара
  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
    const newSearches = { ...supplierSearches };
    const newDropdowns = { ...showSupplierDropdowns };
    delete newSearches[index];
    delete newDropdowns[index];
    setSupplierSearches(newSearches);
    setShowSupplierDropdowns(newDropdowns);
  };

  // Обновление товара
  const handleUpdateItem = (index: number, field: keyof ProjectItem, value: any) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  // Обработка выбора поставщика
  const handleSupplierSelect = (itemIndex: number, supplier: Contractor) => {
    handleUpdateItem(itemIndex, 'supplierId', supplier.id);
    setSupplierSearches(prev => ({ ...prev, [itemIndex]: supplier.name }));
    setShowSupplierDropdowns(prev => ({ ...prev, [itemIndex]: false }));
  };

  // Фильтрация поставщиков для поиска
  const getFilteredSuppliers = (itemIndex: number) => {
    const search = supplierSearches[itemIndex] || '';
    return supplierContractors.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase())
    );
  };

  // Сохранение проекта
  const handleSave = async () => {
    if (!contractorId) {
      alert('Выберите контрагента');
      return;
    }

    if (items.length === 0) {
      alert('Добавьте хотя бы один товар');
      return;
    }

    // Проверка заполненности товаров
    for (const item of items) {
      if (!item.name.trim()) {
        alert('Заполните наименование всех товаров');
        return;
      }
      if (item.quantity <= 0) {
        alert('Количество должно быть больше 0');
        return;
      }
      if (item.declaredPrice < 0) {
        alert('Заявленная стоимость не может быть отрицательной');
        return;
      }
    }

    // Генерируем имя проекта
    const contractorName = contractors.find(c => c.id === contractorId)?.name || contractorSearch;
    const projectName = `Продажа - ${contractorName}${tenderDate ? ` (${new Date(tenderDate).toLocaleDateString('ru-RU')})` : ''}`;

    const projectData: CreateProjectData = {
      name: projectName,
      type: 'sale',
      contractorId,
      tenderLink: tenderLink || undefined,
      tenderDate: tenderDate ? new Date(tenderDate) : undefined,
      qualificationObjectIds: [],
      items: items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        declaredPrice: item.declaredPrice,
        supplierId: item.supplierId,
        supplierPrice: item.supplierPrice,
        description: item.description || undefined
      }))
    };

    await onSave(projectData);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Продажа</h2>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
          title="Закрыть"
          aria-label="Закрыть"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Дата создания */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Дата создания
          </label>
          <input
            type="text"
            value={new Date().toLocaleDateString('ru-RU')}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
          />
        </div>

        {/* Ссылка */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ссылка
          </label>
          <input
            type="text"
            value={tenderLink}
            onChange={(e) => setTenderLink(e.target.value)}
            placeholder="Введите ссылку на объявленную закупку"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Контрагент */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Контрагент *
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={contractorSearch}
              onChange={(e) => {
                setContractorSearch(e.target.value);
                setShowContractorDropdown(true);
              }}
              onFocus={() => setShowContractorDropdown(true)}
              placeholder="Поиск контрагента или добавление нового"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {showContractorDropdown && (
              <div ref={contractorDropdownRef} className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                {filteredBuyerContractors.length > 0 ? (
                  filteredBuyerContractors.map(contractor => (
                    <div
                      key={contractor.id}
                      onClick={() => handleContractorSelect(contractor)}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    >
                      {contractor.name}
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-2 text-gray-500">
                    Контрагент не найден
                  </div>
                )}
                {contractorSearch.trim() && !filteredBuyerContractors.some(c => c.name.toLowerCase() === contractorSearch.toLowerCase()) && (
                  <div
                    onClick={handleAddNewContractor}
                    className="px-4 py-2 hover:bg-green-50 cursor-pointer border-t border-gray-200 text-green-600 font-medium"
                  >
                    + Добавить "{contractorSearch}" как покупателя
                  </div>
                )}
              </div>
            )}
          </div>
          {contractorId && (
            <p className="mt-1 text-xs text-gray-500">
              Выбран: {contractors.find(c => c.id === contractorId)?.name || contractorSearch}
            </p>
          )}
        </div>

        {/* Дата тендера */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Дата тендера
          </label>
          <input
            type="date"
            value={tenderDate}
            onChange={(e) => setTenderDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Товары */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Товары *
            </label>
            <button
              type="button"
              onClick={handleAddItem}
              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors flex items-center space-x-1"
            >
              <Plus className="w-3 h-3" />
              <span>Добавить товар</span>
            </button>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
              <p className="text-sm">Товары не добавлены</p>
              <p className="text-xs mt-1">Нажмите "Добавить товар" для добавления</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-700">Товар {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Наименование */}
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Наименование *</label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleUpdateItem(index, 'name', e.target.value)}
                        placeholder="Введите наименование товара"
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    {/* Количество */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Количество (шт.) *</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    {/* Заявленная стоимость */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Заявленная стоимость *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.declaredPrice}
                        onChange={(e) => handleUpdateItem(index, 'declaredPrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    {/* Поставщик */}
                    <div className="relative">
                      <label className="block text-xs text-gray-500 mb-1">Поставщик</label>
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={supplierSearches[index] || (item.supplierId ? supplierContractors.find(s => s.id === item.supplierId)?.name || '' : '')}
                          onChange={(e) => {
                            setSupplierSearches(prev => ({ ...prev, [index]: e.target.value }));
                            setShowSupplierDropdowns(prev => ({ ...prev, [index]: true }));
                          }}
                          onFocus={() => setShowSupplierDropdowns(prev => ({ ...prev, [index]: true }))}
                          placeholder="Поиск поставщика"
                          className="w-full pl-8 pr-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        {showSupplierDropdowns[index] && (
                          <div 
                            ref={(el) => { supplierDropdownRefs.current[index] = el; }}
                            className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-auto"
                          >
                            {getFilteredSuppliers(index).length > 0 ? (
                              getFilteredSuppliers(index).map(supplier => (
                                <div
                                  key={supplier.id}
                                  onClick={() => handleSupplierSelect(index, supplier)}
                                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                >
                                  {supplier.name}
                                </div>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-gray-500 text-sm">
                                Поставщик не найден
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Стоимость поставщика */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Стоимость поставщика</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.supplierPrice || ''}
                        onChange={(e) => handleUpdateItem(index, 'supplierPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    {/* Описание */}
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Описание</label>
                      <textarea
                        value={item.description || ''}
                        onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                        placeholder="Введите описание товара"
                        rows={2}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Кнопки */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Создание...' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  );
};

