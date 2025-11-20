import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { tenderService } from '../utils/tenderService';
import { TenderSearchSettings, Tender, TenderSearchHistory } from '../types/Tender';
import { Chip } from './ui/Chip';
import { Search, Save, History, X, Plus, Trash2, ExternalLink, Calendar, Building2, FileText } from 'lucide-react';

const TenderSearch: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'settings' | 'tenders' | 'history'>('settings');
  
  // Настройки
  const [purchaseItems, setPurchaseItems] = useState<string[]>([]);
  const [organizationUnps, setOrganizationUnps] = useState<string[]>([]);
  const [purchaseItemInput, setPurchaseItemInput] = useState('');
  const [organizationUnpInput, setOrganizationUnpInput] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  
  // Тендеры
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [tendersLoading, setTendersLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  
  // История
  const [history, setHistory] = useState<TenderSearchHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Загрузка настроек
  useEffect(() => {
    if (user?.id) {
      loadSettings();
      loadTenders();
      loadHistory();
    }
  }, [user?.id]);

  const loadSettings = async () => {
    if (!user?.id) return;
    
    setSettingsLoading(true);
    try {
      const settings = await tenderService.getSearchSettings(user.id);
      if (settings) {
        setPurchaseItems(settings.purchaseItems || []);
        setOrganizationUnps(settings.organizationUnps || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!user?.id) return;
    
    setSettingsSaving(true);
    try {
      const settings: TenderSearchSettings = {
        userId: user.id,
        purchaseItems: purchaseItems,
        organizationUnps: organizationUnps
      };
      
      await tenderService.saveSearchSettings(settings);
      alert('Настройки сохранены успешно');
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error);
      alert('Ошибка сохранения настроек');
    } finally {
      setSettingsSaving(false);
    }
  };

  const loadTenders = async () => {
    if (!user?.id) return;
    
    setTendersLoading(true);
    try {
      const data = await tenderService.getTenders(user.id);
      setTenders(data);
    } catch (error) {
      console.error('Ошибка загрузки тендеров:', error);
    } finally {
      setTendersLoading(false);
    }
  };

  const loadHistory = async () => {
    if (!user?.id) return;
    
    setHistoryLoading(true);
    try {
      const data = await tenderService.getSearchHistory(user.id);
      setHistory(data);
    } catch (error) {
      console.error('Ошибка загрузки истории:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!user?.id) return;
    
    if (purchaseItems.length === 0 && organizationUnps.length === 0) {
      alert('Укажите хотя бы один предмет закупки или УНП организации');
      return;
    }
    
    setParsing(true);
    try {
      // Сохраняем настройки
      const settings: TenderSearchSettings = {
        userId: user.id,
        purchaseItems: purchaseItems,
        organizationUnps: organizationUnps
      };
      
      const savedSettings = await tenderService.saveSearchSettings(settings);
      
      // Создаем запись в истории со статусом "в процессе"
      const historyEntry: Omit<TenderSearchHistory, 'id' | 'searchDate'> = {
        userId: user.id,
        searchSettings: {
          id: savedSettings.id,
          userId: savedSettings.userId,
          purchaseItems: savedSettings.purchaseItems,
          organizationUnps: savedSettings.organizationUnps,
          createdAt: savedSettings.createdAt,
          updatedAt: savedSettings.updatedAt
        },
        foundTendersCount: 0,
        parsingStatus: 'in_progress',
        errorMessage: undefined
      };
      
      await tenderService.saveSearchHistory(historyEntry);
      
      // ВНИМАНИЕ: Реальный парсинг требует серверной реализации
      // Здесь мы только имитируем процесс
      alert('Парсинг тендеров требует серверной реализации. В реальной версии здесь будет запрос к backend для парсинга сайта goszakupki.by/tenders/posted');
      
      // Обновляем историю со статусом "успешно" (в реальной версии это будет после парсинга)
      await tenderService.saveSearchHistory({
        ...historyEntry,
        parsingStatus: 'success',
        foundTendersCount: 0
      });
      
      // Перезагружаем данные
      await loadTenders();
      await loadHistory();
      
      setActiveTab('tenders');
    } catch (error) {
      console.error('Ошибка поиска тендеров:', error);
      
      // Сохраняем ошибку в историю
      if (user?.id) {
        try {
          const settings: TenderSearchSettings = {
            userId: user.id,
            purchaseItems: purchaseItems,
            organizationUnps: organizationUnps
          };
          
          await tenderService.saveSearchHistory({
            userId: user.id,
            searchSettings: settings,
            foundTendersCount: 0,
            parsingStatus: 'error',
            errorMessage: error instanceof Error ? error.message : 'Неизвестная ошибка'
          });
          
          await loadHistory();
        } catch (historyError) {
          console.error('Ошибка сохранения истории:', historyError);
        }
      }
      
      alert('Ошибка поиска тендеров');
    } finally {
      setParsing(false);
    }
  };

  const addPurchaseItem = () => {
    const trimmed = purchaseItemInput.trim();
    if (trimmed && !purchaseItems.includes(trimmed)) {
      const newItems = [...purchaseItems, trimmed];
      setPurchaseItems(newItems);
      setPurchaseItemInput('');
      // Автосохранение при добавлении
      if (user?.id) {
        setTimeout(() => {
          const settings: TenderSearchSettings = {
            userId: user.id,
            purchaseItems: newItems,
            organizationUnps: organizationUnps
          };
          console.log('Автосохранение настроек:', settings);
          tenderService.saveSearchSettings(settings).catch(error => {
            console.error('Ошибка автосохранения:', error);
          });
        }, 100);
      }
    }
  };

  const removePurchaseItem = (item: string) => {
    const newItems = purchaseItems.filter(i => i !== item);
    setPurchaseItems(newItems);
    // Автосохранение при удалении
    if (user?.id) {
      setTimeout(() => {
        const settings: TenderSearchSettings = {
          userId: user.id,
          purchaseItems: newItems,
          organizationUnps: organizationUnps
        };
        console.log('Автосохранение настроек (удаление):', settings);
        tenderService.saveSearchSettings(settings).catch(error => {
          console.error('Ошибка автосохранения:', error);
        });
      }, 100);
    }
  };

  const addOrganizationUnp = () => {
    const trimmed = organizationUnpInput.trim();
    if (trimmed && !organizationUnps.includes(trimmed)) {
      const newUnps = [...organizationUnps, trimmed];
      setOrganizationUnps(newUnps);
      setOrganizationUnpInput('');
      // Автосохранение при добавлении
      if (user?.id) {
        setTimeout(() => {
          const settings: TenderSearchSettings = {
            userId: user.id,
            purchaseItems: purchaseItems,
            organizationUnps: newUnps
          };
          console.log('Автосохранение настроек (добавление УНП):', settings);
          tenderService.saveSearchSettings(settings).catch(error => {
            console.error('Ошибка автосохранения:', error);
          });
        }, 100);
      }
    }
  };

  const removeOrganizationUnp = (unp: string) => {
    const newUnps = organizationUnps.filter(u => u !== unp);
    setOrganizationUnps(newUnps);
    // Автосохранение при удалении
    if (user?.id) {
      setTimeout(() => {
        const settings: TenderSearchSettings = {
          userId: user.id,
          purchaseItems: purchaseItems,
          organizationUnps: newUnps
        };
        console.log('Автосохранение настроек (удаление УНП):', settings);
        tenderService.saveSearchSettings(settings).catch(error => {
          console.error('Ошибка автосохранения:', error);
        });
      }, 100);
    }
  };

  const handlePurchaseItemKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addPurchaseItem();
    }
  };

  const handleOrganizationUnpKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addOrganizationUnp();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Поиск тендеров</h1>
        
        {/* Вкладки */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Настройки
            </button>
            <button
              onClick={() => setActiveTab('tenders')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tenders'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Найденные тендеры ({tenders.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              История поиска
            </button>
          </nav>
        </div>

        {/* Раздел Настройки */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Настройки поиска</h2>
            
            {/* Предметы закупки */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Предметы закупки
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={purchaseItemInput}
                  onChange={(e) => setPurchaseItemInput(e.target.value)}
                  onKeyPress={handlePurchaseItemKeyPress}
                  placeholder="Введите предмет закупки и нажмите Enter"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  onClick={addPurchaseItem}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Добавить
                </button>
              </div>
              {purchaseItems.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {purchaseItems.map((item, index) => (
                    <Chip
                      key={index}
                      label={item}
                      onRemove={() => removePurchaseItem(item)}
                      variant="primary"
                    />
                  ))}
                </div>
              )}
            </div>

            {/* УНП организаций */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                УНП организации
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={organizationUnpInput}
                  onChange={(e) => setOrganizationUnpInput(e.target.value)}
                  onKeyPress={handleOrganizationUnpKeyPress}
                  placeholder="Введите УНП организации и нажмите Enter"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  onClick={addOrganizationUnp}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Добавить
                </button>
              </div>
              {organizationUnps.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {organizationUnps.map((unp, index) => (
                    <Chip
                      key={index}
                      label={unp}
                      onRemove={() => removeOrganizationUnp(unp)}
                      variant="success"
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Кнопки действий */}
            <div className="flex gap-3">
              <button
                onClick={saveSettings}
                disabled={settingsSaving || settingsLoading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {settingsSaving ? 'Сохранение...' : 'Сохранить настройки'}
              </button>
              <button
                onClick={handleSearch}
                disabled={parsing || settingsLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
                {parsing ? 'Поиск...' : 'Найти тендеры'}
              </button>
            </div>
          </div>
        )}

        {/* Раздел Найденные тендеры */}
        {activeTab === 'tenders' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Найденные тендеры</h2>
            </div>
            {tendersLoading ? (
              <div className="p-6 text-center text-gray-500">Загрузка...</div>
            ) : tenders.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                Тендеры не найдены. Выполните поиск в разделе "Настройки".
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {tenders.map((tender) => (
                  <div key={tender.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {tender.title}
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <span>Номер: {tender.tenderNumber}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            <span>{tender.organizationName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>УНП: {tender.organizationUnp}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>Опубликован: {new Date(tender.publicationDate).toLocaleDateString('ru-RU')}</span>
                          </div>
                        </div>
                        {tender.purchaseItem && (
                          <div className="text-sm text-gray-600 mb-2">
                            Предмет закупки: {tender.purchaseItem}
                          </div>
                        )}
                        {tender.deadlineDate && (
                          <div className="text-sm text-gray-600 mb-2">
                            Срок подачи: {new Date(tender.deadlineDate).toLocaleDateString('ru-RU')}
                          </div>
                        )}
                      </div>
                      <a
                        href={tender.tenderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-4 flex items-center gap-2 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Открыть
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Раздел История поиска */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">История поиска и парсинга</h2>
            </div>
            {historyLoading ? (
              <div className="p-6 text-center text-gray-500">Загрузка...</div>
            ) : history.length === 0 ? (
              <div className="p-6 text-center text-gray-500">История поиска пуста</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {history.map((entry) => (
                  <div key={entry.id} className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-sm text-gray-500 mb-1">
                          {new Date(entry.searchDate).toLocaleString('ru-RU')}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            entry.parsingStatus === 'success' ? 'bg-green-100 text-green-800' :
                            entry.parsingStatus === 'error' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {entry.parsingStatus === 'success' ? 'Успешно' :
                             entry.parsingStatus === 'error' ? 'Ошибка' : 'В процессе'}
                          </span>
                          <span className="text-sm text-gray-600">
                            Найдено тендеров: {entry.foundTendersCount}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      <div className="font-medium mb-1">Предметы закупки:</div>
                      <div className="pl-4">
                        {entry.searchSettings.purchaseItems.length > 0 ? (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {entry.searchSettings.purchaseItems.map((item, idx) => (
                              <Chip key={idx} label={item} variant="primary" size="sm" />
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">Не указаны</span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      <div className="font-medium mb-1">УНП организаций:</div>
                      <div className="pl-4">
                        {entry.searchSettings.organizationUnps.length > 0 ? (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {entry.searchSettings.organizationUnps.map((unp, idx) => (
                              <Chip key={idx} label={unp} variant="success" size="sm" />
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">Не указаны</span>
                        )}
                      </div>
                    </div>
                    {entry.errorMessage && (
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        Ошибка: {entry.errorMessage}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TenderSearch;
