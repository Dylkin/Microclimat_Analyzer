import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Search } from 'lucide-react';
import { Contractor, ContractorRole } from '../types/Contractor';
import { contractorService } from '../utils/contractorService';
import { CreateProjectData } from '../types/Project';
import { EquipmentCard, EquipmentSection } from '../types/EquipmentSections';
import { equipmentSectionsService } from '../utils/equipmentSectionsService';

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
  categoryId?: string;
  channelsCount?: number;
  dosingVolume?: string;
  volumeStep?: string;
  dosingAccuracy?: string;
  reproducibility?: string;
  autoclavable?: boolean;
  inRegistrySI?: boolean;
  customTechnicalSpecs?: Record<string, string>; // Для хранения пользовательских технических характеристик
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
  const [productSearches, setProductSearches] = useState<Record<number, string>>({});
  const [showProductDropdowns, setShowProductDropdowns] = useState<Record<number, boolean>>({});
  const [productSearchResults, setProductSearchResults] = useState<Record<number, EquipmentCard[]>>({});
  const [productSearchLoading, setProductSearchLoading] = useState<Record<number, boolean>>({});
  const [categories, setCategories] = useState<EquipmentSection[]>([]);
  const [allCategoryProducts, setAllCategoryProducts] = useState<Record<number, EquipmentCard[]>>({});
  // Отслеживаем, были ли изменены технические характеристики пользователем (для определения, применять ли фильтрацию)
  const [userModifiedSpecs, setUserModifiedSpecs] = useState<Record<number, boolean>>({});
  // Отслеживаем, когда пользователь выбрал "Добавить новое значение" для каждого поля
  const [showCustomInputs, setShowCustomInputs] = useState<Record<string, boolean>>({});
  
  const contractorDropdownRef = useRef<HTMLDivElement>(null);
  const supplierDropdownRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const productDropdownRefs = useRef<Record<number, HTMLDivElement | null>>({});

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
      
      Object.keys(productDropdownRefs.current).forEach(index => {
        const ref = productDropdownRefs.current[parseInt(index)];
        if (ref && !ref.contains(event.target as Node)) {
          setShowProductDropdowns(prev => ({ ...prev, [parseInt(index)]: false }));
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

  // Загрузка категорий
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await equipmentSectionsService.getSections();
        setCategories(data);
      } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
      }
    };
    loadCategories();
  }, []);

  // Добавление товара
  const handleAddItem = () => {
    setItems(prev => [...prev, {
      name: '',
      quantity: 1,
      declaredPrice: 0,
      supplierId: undefined,
      supplierPrice: undefined,
      description: '',
      categoryId: undefined,
      channelsCount: undefined,
      dosingVolume: '',
      volumeStep: '',
      dosingAccuracy: '',
      reproducibility: '',
      autoclavable: undefined,
      inRegistrySI: false,
      customTechnicalSpecs: {}
    }]);
  };

  // Удаление товара
  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
    const newSupplierSearches = { ...supplierSearches };
    const newSupplierDropdowns = { ...showSupplierDropdowns };
    const newProductSearches = { ...productSearches };
    const newProductDropdowns = { ...showProductDropdowns };
    const newProductResults = { ...productSearchResults };
    const newProductLoading = { ...productSearchLoading };
    delete newSupplierSearches[index];
    delete newSupplierDropdowns[index];
    delete newProductSearches[index];
    delete newProductDropdowns[index];
    delete newProductResults[index];
    delete newProductLoading[index];
    setSupplierSearches(newSupplierSearches);
    setShowSupplierDropdowns(newSupplierDropdowns);
    setProductSearches(newProductSearches);
    setShowProductDropdowns(newProductDropdowns);
    setProductSearchResults(newProductResults);
    setProductSearchLoading(newProductLoading);
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

  // Функция фильтрации товаров по техническим характеристикам
  // Фильтруем только по тем полям, которые пользователь явно изменил (не пустые строки и не undefined для числовых)
  const filterCardsBySpecs = (cards: EquipmentCard[], item: ProjectItem): EquipmentCard[] => {
    if (!item.categoryId) return cards;
    
    // Если нет заполненных технических характеристик, возвращаем все товары
    const hasFilters = 
      (item.channelsCount !== undefined && item.channelsCount !== null) ||
      (item.dosingVolume && item.dosingVolume.trim()) ||
      (item.volumeStep && item.volumeStep.trim()) ||
      (item.dosingAccuracy && item.dosingAccuracy.trim()) ||
      (item.reproducibility && item.reproducibility.trim()) ||
      (item.autoclavable !== undefined && item.autoclavable !== null);
    
    if (!hasFilters) {
      return cards;
    }
    
    return cards.filter(card => {
      // Фильтрация по техническим характеристикам
      // Количество каналов - фильтруем только если явно указано
      if (item.channelsCount !== undefined && item.channelsCount !== null && card.channelsCount !== item.channelsCount) {
        return false;
      }
      // Объем дозирования - фильтруем только если указано и не пустая строка
      if (item.dosingVolume && item.dosingVolume.trim() && card.dosingVolume && !card.dosingVolume.toLowerCase().includes(item.dosingVolume.toLowerCase())) {
        return false;
      }
      // Шаг установки объема - фильтруем только если указано и не пустая строка
      if (item.volumeStep && item.volumeStep.trim() && card.volumeStep && !card.volumeStep.toLowerCase().includes(item.volumeStep.toLowerCase())) {
        return false;
      }
      // Точность дозирования - фильтруем только если указано и не пустая строка
      if (item.dosingAccuracy && item.dosingAccuracy.trim() && card.dosingAccuracy && !card.dosingAccuracy.toLowerCase().includes(item.dosingAccuracy.toLowerCase())) {
        return false;
      }
      // Воспроизводимость - фильтруем только если указано и не пустая строка
      if (item.reproducibility && item.reproducibility.trim() && card.reproducibility && !card.reproducibility.toLowerCase().includes(item.reproducibility.toLowerCase())) {
        return false;
      }
      // Автоклавируемость - фильтруем только если явно указано (не undefined)
      if (item.autoclavable !== undefined && item.autoclavable !== null && card.autoclavable !== item.autoclavable) {
        return false;
      }
      return true;
    });
  };

  // Загрузка товаров при выборе категории или изменении технических характеристик
  useEffect(() => {
    const loadTimeouts: Record<number, NodeJS.Timeout> = {};
    
    items.forEach((item, index) => {
      if (item.categoryId) {
        // Очищаем предыдущий таймаут
        if (loadTimeouts[index]) {
          clearTimeout(loadTimeouts[index]);
        }
        
        // Загружаем товары категории с фильтрацией по техническим характеристикам
        loadTimeouts[index] = setTimeout(async () => {
          setProductSearchLoading(prev => ({ ...prev, [index]: true }));
          try {
            // Получаем все товары категории (без поискового запроса)
            const cards = await equipmentSectionsService.getCards(undefined, item.categoryId);
            
            // Сохраняем все товары категории для последующей фильтрации
            setAllCategoryProducts(prev => ({ ...prev, [index]: cards }));
            
            // Фильтруем по техническим характеристикам только если пользователь их изменил
            // При первоначальной загрузке (после выбора категории) показываем все товары
            const filteredCards = userModifiedSpecs[index] 
              ? filterCardsBySpecs(cards, item)
              : cards;
            
            setProductSearchResults(prev => ({ ...prev, [index]: filteredCards }));
            // Автоматически показываем список товаров при загрузке, если есть товары в категории
            // Показываем список даже если после фильтрации товаров нет - пользователь может изменить фильтры
            setShowProductDropdowns(prev => ({ ...prev, [index]: true }));
          } catch (error) {
            console.error('Ошибка загрузки товаров категории:', error);
            setProductSearchResults(prev => ({ ...prev, [index]: [] }));
            setAllCategoryProducts(prev => ({ ...prev, [index]: [] }));
          } finally {
            setProductSearchLoading(prev => ({ ...prev, [index]: false }));
          }
        }, 300);
      } else {
        // Если категория не выбрана, очищаем результаты
        setProductSearchResults(prev => ({ ...prev, [index]: [] }));
        setAllCategoryProducts(prev => ({ ...prev, [index]: [] }));
        setShowProductDropdowns(prev => ({ ...prev, [index]: false }));
      }
    });
    
    return () => {
      Object.values(loadTimeouts).forEach(timeout => clearTimeout(timeout));
    };
  }, [items.map(item => `${item.categoryId}-${item.channelsCount}-${item.dosingVolume}-${item.volumeStep}-${item.dosingAccuracy}-${item.reproducibility}-${item.autoclavable}`).join('|'), userModifiedSpecs]);


  // Обработка выбора товара из справочника
  const handleProductSelect = (itemIndex: number, product: EquipmentCard) => {
    handleUpdateItem(itemIndex, 'name', product.name);
    setProductSearches(prev => ({ ...prev, [itemIndex]: product.name }));
    setShowProductDropdowns(prev => ({ ...prev, [itemIndex]: false }));
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
      // Если наименование не указано, проверяем, что выбрана категория
      if (!item.name.trim() && !item.categoryId) {
        alert('Заполните наименование товара или выберите категорию');
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
      items: items.map((item, itemIndex) => {
        // Если наименование указано пользователем, используем его
        let itemName = item.name.trim();
        
        // Если наименование не указано, но выбрана категория, генерируем наименование на основе категории
        if (!itemName && item.categoryId) {
          const category = categories.find((c: EquipmentSection) => c.id === item.categoryId);
          if (category) {
            itemName = category.name;
            // Добавляем технические характеристики к наименованию, если они указаны пользователем
            const specs: string[] = [];
            if (userModifiedSpecs[itemIndex] && item.channelsCount !== undefined && item.channelsCount !== null) {
              specs.push(`${item.channelsCount} канал(ов)`);
            }
            if (userModifiedSpecs[itemIndex] && item.dosingVolume && item.dosingVolume.trim()) {
              specs.push(`объем: ${item.dosingVolume}`);
            }
            if (userModifiedSpecs[itemIndex] && item.autoclavable !== undefined && item.autoclavable !== null) {
              specs.push(item.autoclavable ? 'автоклавируемый' : 'не автоклавируемый');
            }
            if (specs.length > 0) {
              itemName += ` (${specs.join(', ')})`;
            }
          } else {
            itemName = 'Товар без наименования';
          }
        }
        
        // Если наименование все еще пустое (нет категории и нет наименования), используем значение по умолчанию
        if (!itemName) {
          itemName = 'Товар без наименования';
        }
        
        return {
          name: itemName,
          quantity: item.quantity,
          declaredPrice: item.declaredPrice,
          supplierId: item.supplierId,
          supplierPrice: item.supplierPrice,
          description: item.description || undefined,
          categoryId: item.categoryId,
          channelsCount: item.channelsCount,
          dosingVolume: item.dosingVolume,
          volumeStep: item.volumeStep,
          dosingAccuracy: item.dosingAccuracy,
          reproducibility: item.reproducibility,
          autoclavable: item.autoclavable,
          inRegistrySI: item.inRegistrySI
        };
      })
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
            type="date"
            value={new Date().toISOString().split('T')[0]}
            disabled
            title="Дата создания"
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
                    {/* Категория */}
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Категория</label>
                      <select
                        value={item.categoryId || ''}
                        onChange={(e) => {
                          const categoryId = e.target.value || undefined;
                          handleUpdateItem(index, 'categoryId', categoryId);
                          // Если выбрана категория, загружаем её технические характеристики
                          if (categoryId) {
                            const category = categories.find((c: EquipmentSection) => c.id === categoryId);
                            if (category) {
                              handleUpdateItem(index, 'channelsCount', category.channelsCount);
                              handleUpdateItem(index, 'dosingVolume', category.dosingVolume || '');
                              handleUpdateItem(index, 'volumeStep', category.volumeStep || '');
                              handleUpdateItem(index, 'dosingAccuracy', category.dosingAccuracy || '');
                              handleUpdateItem(index, 'reproducibility', category.reproducibility || '');
                              handleUpdateItem(index, 'autoclavable', category.autoclavable);
                              handleUpdateItem(index, 'inRegistrySI', category.inRegistrySI || false);
                            }
                            // Сбрасываем флаг изменений технических характеристик при выборе новой категории
                            setUserModifiedSpecs(prev => ({ ...prev, [index]: false }));
                            // Показываем список товаров при выборе категории (товары загрузятся автоматически)
                            // Список будет показан после загрузки товаров в useEffect
                          } else {
                            // Очищаем технические характеристики при снятии выбора категории
                            handleUpdateItem(index, 'channelsCount', undefined);
                            handleUpdateItem(index, 'dosingVolume', '');
                            handleUpdateItem(index, 'volumeStep', '');
                            handleUpdateItem(index, 'dosingAccuracy', '');
                            handleUpdateItem(index, 'reproducibility', '');
                            handleUpdateItem(index, 'autoclavable', undefined);
                            handleUpdateItem(index, 'inRegistrySI', false);
                            handleUpdateItem(index, 'name', '');
                            setProductSearches(prev => ({ ...prev, [index]: '' }));
                            setShowProductDropdowns(prev => ({ ...prev, [index]: false }));
                            setProductSearchResults(prev => ({ ...prev, [index]: [] }));
                          }
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">Выберите категорию</option>
                        {categories.map((category: EquipmentSection) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Технические характеристики - показываем только если выбрана категория */}
                    {item.categoryId && (() => {
                      const category = categories.find((c: EquipmentSection) => c.id === item.categoryId);
                      if (!category || !category.technicalSpecsRanges) return null;
                      
                      // Получаем все технические характеристики из категории
                      const allSpecs = Object.entries(category.technicalSpecsRanges)
                        .filter(([_, specRange]) => specRange.enabled)
                        .map(([specKey, specRange]) => ({
                          key: specKey,
                          label: specRange.label || specKey,
                          values: specRange.values || [],
                          specRange
                        }));
                      
                      return (
                        <>
                          <div className="md:col-span-2 border-t pt-3 mt-2">
                            <h4 className="text-xs font-semibold text-gray-700 mb-2">Технические характеристики</h4>
                          </div>
                          
                          {/* Отображаем все технические характеристики из категории */}
                          {allSpecs.map((spec) => {
                            const availableValues = spec.values.filter(v => v.trim());
                            const currentValue = item.customTechnicalSpecs?.[spec.key] || '';
                            const inputKey = `${spec.key}_${index}`;
                            const showCustomInput = showCustomInputs[inputKey] || (!availableValues.includes(currentValue) && currentValue !== '');
                            
                            return (
                              <div key={spec.key}>
                                <label className="block text-xs text-gray-500 mb-1">{spec.label}</label>
                                <div className="space-y-1">
                                  <select
                                    value={availableValues.includes(currentValue) ? currentValue : (showCustomInput ? '__custom__' : '')}
                                    onChange={(e) => {
                                      if (e.target.value === '__custom__') {
                                        setShowCustomInputs(prev => ({ ...prev, [inputKey]: true }));
                                      } else if (e.target.value === '') {
                                        handleUpdateItem(index, 'customTechnicalSpecs', {
                                          ...(item.customTechnicalSpecs || {}),
                                          [spec.key]: ''
                                        });
                                        setUserModifiedSpecs(prev => ({ ...prev, [index]: true }));
                                        setShowCustomInputs(prev => ({ ...prev, [inputKey]: false }));
                                      } else {
                                        handleUpdateItem(index, 'customTechnicalSpecs', {
                                          ...(item.customTechnicalSpecs || {}),
                                          [spec.key]: e.target.value
                                        });
                                        setUserModifiedSpecs(prev => ({ ...prev, [index]: true }));
                                        setShowCustomInputs(prev => ({ ...prev, [inputKey]: false }));
                                      }
                                    }}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                  >
                                    <option value="">Не указано</option>
                                    {availableValues.map((val) => (
                                      <option key={val} value={val}>{val}</option>
                                    ))}
                                    <option value="__custom__">+ Добавить новое значение</option>
                                  </select>
                                  {showCustomInput && (
                                    <div className="flex items-center space-x-1">
                                      <input
                                        type="text"
                                        value={currentValue}
                                        onChange={(e) => {
                                          handleUpdateItem(index, 'customTechnicalSpecs', {
                                            ...(item.customTechnicalSpecs || {}),
                                            [spec.key]: e.target.value
                                          });
                                          setUserModifiedSpecs(prev => ({ ...prev, [index]: true }));
                                        }}
                                        className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder={`Введите значение для ${spec.label.toLowerCase()}`}
                                      />
                                      {category && (
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            if (currentValue && !availableValues.includes(currentValue)) {
                                              try {
                                                const updatedRanges = {
                                                  ...(category.technicalSpecsRanges || {}),
                                                  [spec.key]: {
                                                    enabled: true,
                                                    values: [...availableValues, currentValue],
                                                    label: spec.label
                                                  }
                                                };
                                                await equipmentSectionsService.updateSection(category.id, {
                                                  technicalSpecsRanges: updatedRanges
                                                });
                                                const updatedCategories = categories.map(c => 
                                                  c.id === category.id 
                                                    ? { ...c, technicalSpecsRanges: updatedRanges }
                                                    : c
                                                );
                                                setCategories(updatedCategories);
                                                setShowCustomInputs(prev => ({ ...prev, [inputKey]: false }));
                                              } catch (error) {
                                                console.error('Ошибка сохранения нового значения:', error);
                                                alert('Ошибка сохранения нового значения');
                                              }
                                            }
                                          }}
                                          className="px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs"
                                          title="Сохранить новое значение в категорию"
                                        >
                                          Сохранить
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          
                          {/* Чекбокс "Наличие в реестре СИ" */}
                          <div className="md:col-span-2">
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={item.inRegistrySI || false}
                                onChange={(e) => handleUpdateItem(index, 'inRegistrySI', e.target.checked)}
                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                              />
                              <span className="text-xs text-gray-700">Наличие в реестре СИ</span>
                            </label>
                          </div>
                        </>
                      );
                    })()}

                    {/* Наименование */}

                    {/* Наименование */}
                    <div className="md:col-span-2 relative">
                      <label className="block text-xs text-gray-500 mb-1">
                        Наименование {item.categoryId ? '(необязательно, если выбрана категория)' : '*'}
                      </label>
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            handleUpdateItem(index, 'name', e.target.value);
                            setProductSearches(prev => ({ ...prev, [index]: e.target.value }));
                            // Показываем список при вводе, если выбрана категория
                            if (item.categoryId) {
                              setShowProductDropdowns(prev => ({ ...prev, [index]: true }));
                            }
                          }}
                          onFocus={() => {
                            // Показываем список при фокусе, если выбрана категория
                            if (item.categoryId) {
                              setShowProductDropdowns(prev => ({ ...prev, [index]: true }));
                              // Если товары еще не загружены, но категория выбрана, они загрузятся автоматически
                            }
                          }}
                          placeholder={item.categoryId ? "Поиск товаров категории или введите наименование" : "Сначала выберите категорию"}
                          disabled={!item.categoryId}
                          className={`w-full pl-8 pr-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${!item.categoryId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        />
                        {showProductDropdowns[index] && item.categoryId && (
                          <div 
                            ref={el => productDropdownRefs.current[index] = el}
                            className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto"
                          >
                            {productSearchLoading[index] ? (
                              <div className="px-4 py-2 text-gray-500 text-sm">Загрузка товаров...</div>
                            ) : (() => {
                              // Фильтруем товары по поисковому запросу (по наименованию)
                              const searchTerm = productSearches[index]?.toLowerCase().trim() || '';
                              const allProducts = productSearchResults[index] || [];
                              const filteredProducts = allProducts.filter(product => {
                                if (searchTerm) {
                                  return product.name.toLowerCase().includes(searchTerm);
                                }
                                return true;
                              });
                              
                              if (filteredProducts.length > 0) {
                                return filteredProducts.map(product => (
                                  <div
                                    key={product.id}
                                    onClick={() => handleProductSelect(index, product)}
                                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                  >
                                    <div className="font-medium text-sm">{product.name}</div>
                                    {product.manufacturer && (
                                      <div className="text-xs text-gray-500">Производитель: {product.manufacturer}</div>
                                    )}
                                    {product.sectionName && (
                                      <div className="text-xs text-gray-500">Категория: {product.sectionName}</div>
                                    )}
                                  </div>
                                ));
                              } else if (allProducts.length === 0) {
                                return (
                                  <div className="px-4 py-2 text-gray-500 text-sm">
                                    В данной категории пока нет товаров
                                  </div>
                                );
                              } else {
                                return (
                                  <div className="px-4 py-2 text-gray-500 text-sm">
                                    {searchTerm 
                                      ? `Товары не найдены по запросу "${productSearches[index]}"` 
                                      : 'Товары не найдены по заданным техническим характеристикам. Попробуйте изменить фильтры.'}
                                  </div>
                                );
                              }
                            })()}
                          </div>
                        )}
                      </div>
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

