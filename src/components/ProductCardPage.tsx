import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Save, X, AlertTriangle, Loader, Package, RefreshCw
} from 'lucide-react';
import { EquipmentCard, UpdateEquipmentCardData } from '../types/EquipmentSections';
import { equipmentSectionsService } from '../utils/equipmentSectionsService';
import { EquipmentSection } from '../types/EquipmentSections';

interface ProductCardPageProps {
  cardId: string;
  onBack: () => void;
  initialEditMode?: boolean; // Режим редактирования при открытии
}

const ProductCardPage: React.FC<ProductCardPageProps> = ({ cardId, onBack, initialEditMode = false }) => {
  const [card, setCard] = useState<EquipmentCard | null>(null);
  const [sections, setSections] = useState<EquipmentSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(initialEditMode);

  const [formData, setFormData] = useState<UpdateEquipmentCardData>({
    name: '',
    manufacturer: '',
    series: '',
    channelsCount: undefined,
    dosingVolume: '',
    volumeStep: '',
    dosingAccuracy: '',
    reproducibility: '',
    autoclavable: undefined,
    externalUrl: ''
  });

  useEffect(() => {
    if (cardId) {
      loadCard();
      loadSections();
    }
  }, [cardId]);

  // Перезагружаем карточку при изменении cardId
  useEffect(() => {
    if (cardId) {
      loadCard();
    }
  }, [cardId]);

  useEffect(() => {
    // Если открываем в режиме редактирования, устанавливаем режим после загрузки карточки
    if (initialEditMode && card && !isEditing) {
      setIsEditing(true);
    }
  }, [card, initialEditMode]);

  const loadCard = async () => {
    if (!cardId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await equipmentSectionsService.getCard(cardId);
      setCard(data);
      setFormData({
        name: data.name,
        manufacturer: data.manufacturer || '',
        series: data.series || '',
        channelsCount: data.channelsCount,
        dosingVolume: data.dosingVolume || '',
        volumeStep: data.volumeStep || '',
        dosingAccuracy: data.dosingAccuracy || '',
        reproducibility: data.reproducibility || '',
        autoclavable: data.autoclavable,
        externalUrl: data.externalUrl || ''
      });
    } catch (err) {
      console.error('Ошибка загрузки карточки:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const loadSections = async () => {
    try {
      const data = await equipmentSectionsService.getSections();
      setSections(data);
    } catch (err) {
      console.error('Ошибка загрузки разделов:', err);
    }
  };

  const handleSave = async () => {
    if (!cardId || !formData.name?.trim()) {
      alert('Наименование карточки обязательно');
      return;
    }

    setSaving(true);
    try {
      const updatedCard = await equipmentSectionsService.updateCard(cardId, formData);
      setCard(updatedCard);
      // Обновляем formData с актуальными данными
      setFormData({
        name: updatedCard.name,
        manufacturer: updatedCard.manufacturer || '',
        series: updatedCard.series || '',
        channelsCount: updatedCard.channelsCount,
        dosingVolume: updatedCard.dosingVolume || '',
        volumeStep: updatedCard.volumeStep || '',
        dosingAccuracy: updatedCard.dosingAccuracy || '',
        reproducibility: updatedCard.reproducibility || '',
        autoclavable: updatedCard.autoclavable,
        externalUrl: updatedCard.externalUrl || ''
      });
      setIsEditing(false);
      alert('Карточка успешно обновлена');
    } catch (err) {
      alert(`Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    onBack();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin w-8 h-8 text-indigo-600" />
        <span className="ml-3 text-gray-600">Загрузка карточки...</span>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="space-y-6">
        <button
          onClick={handleBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад к товарам</span>
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Ошибка</h3>
              <p className="text-sm text-red-700 mt-1">{error || 'Карточка не найдена'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleBack}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Package className="w-6 h-6 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Редактирование карточки' : 'Просмотр карточки'}
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  setIsEditing(false);
                  loadCard(); // Восстанавливаем исходные данные
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <Loader className="animate-spin w-4 h-4" />
                    <span>Сохранение...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Сохранить</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  loadCard();
                }}
                disabled={loading}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
                title="Обновить данные из базы"
              >
                {loading ? (
                  <Loader className="animate-spin w-4 h-4" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>Обновить</span>
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
              >
                <Package className="w-4 h-4" />
                <span>Редактировать</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Форма/Просмотр */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Левая колонка */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Раздел
              </label>
              {isEditing ? (
                <select
                  value={card.sectionId}
                  onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-gray-900">{card.sectionName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Наименование *
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              ) : (
                <p className="text-sm text-gray-900">{card.name}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Производитель
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                ) : (
                  <p className="text-sm text-gray-900">{card.manufacturer || '-'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Серия
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.series}
                    onChange={(e) => setFormData({ ...formData, series: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                ) : (
                  <p className="text-sm text-gray-900">{card.series || '-'}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ссылка на внешний ресурс
              </label>
              {isEditing ? (
                <input
                  type="url"
                  value={formData.externalUrl}
                  onChange={(e) => setFormData({ ...formData, externalUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              ) : (
                <a
                  href={card.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                  title={card.externalUrl || ''}
                >
                  {card.externalUrl ? (card.externalUrl.length > 20 ? card.externalUrl.substring(0, 20) + '...' : card.externalUrl) : '-'}
                </a>
              )}
            </div>

          </div>

          {/* Правая колонка - Технические характеристики */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Технические характеристики</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Количество каналов
              </label>
              {isEditing ? (
                <input
                  type="number"
                  value={formData.channelsCount || ''}
                  onChange={(e) => setFormData({ ...formData, channelsCount: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  min="1"
                />
              ) : (
                <p className="text-sm text-gray-900">{card.channelsCount || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Объем дозирования
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.dosingVolume}
                  onChange={(e) => setFormData({ ...formData, dosingVolume: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="например, 0,1-2,5 мкл"
                />
              ) : (
                <p className="text-sm text-gray-900">{card.dosingVolume || '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Шаг установки объема дозы
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.volumeStep}
                  onChange={(e) => setFormData({ ...formData, volumeStep: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              ) : (
                <p className="text-sm text-gray-900">{card.volumeStep ? card.volumeStep : '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Точность дозирования
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.dosingAccuracy}
                  onChange={(e) => setFormData({ ...formData, dosingAccuracy: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              ) : (
                <p className="text-sm text-gray-900">{card.dosingAccuracy ? card.dosingAccuracy : '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Воспроизводимость
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.reproducibility}
                  onChange={(e) => setFormData({ ...formData, reproducibility: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              ) : (
                <p className="text-sm text-gray-900">{card.reproducibility ? card.reproducibility : '-'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Автоклавируемость
              </label>
              {isEditing ? (
                <select
                  value={formData.autoclavable === undefined ? '' : formData.autoclavable ? 'true' : 'false'}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    autoclavable: e.target.value === '' ? undefined : e.target.value === 'true' 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Не указано</option>
                  <option value="true">Да</option>
                  <option value="false">Нет</option>
                </select>
              ) : (
                <p className="text-sm text-gray-900">
                  {card.autoclavable === undefined ? '-' : card.autoclavable ? 'Да' : 'Нет'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCardPage;

