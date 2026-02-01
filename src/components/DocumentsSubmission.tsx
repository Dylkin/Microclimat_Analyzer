import React, { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, Package, Building2, ClipboardList, User, Phone, Mail, MessageSquare, Send } from 'lucide-react';
import { Project, ProjectItem } from '../types/Project';
import { Contractor } from '../types/Contractor';
import { contractorService } from '../utils/contractorService';
import { ProjectInfo } from './contract/ProjectInfo';
import { apiClient } from '../utils/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { mailSettings } from '../services/mailSettings';
import { equipmentSectionsService } from '../utils/equipmentSectionsService';
import { EquipmentSection } from '../types/EquipmentSections';

interface DocumentsSubmissionProps {
  project: Project;
  onBack: () => void;
  onPageChange?: (page: string, data?: any) => void;
}

export const DocumentsSubmission: React.FC<DocumentsSubmissionProps> = ({ project, onBack }) => {
  const [currentProject, setCurrentProject] = useState<Project>(project);
  const [suppliers, setSuppliers] = useState<Contractor[]>([]);
  const [categories, setCategories] = useState<EquipmentSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessagesForContact, setLoadingMessagesForContact] = useState<string | null>(null);
  const [contactMessages, setContactMessages] = useState<
    Record<
      string,
      {
        subject: string | null;
        body: string | null;
        receivedAt: string;
      }[]
    >
  >({});
  const { user } = useAuth();

  useEffect(() => {
    const loadFullProjectAndSuppliers = async () => {
      try {
        setLoading(true);
        setError(null);

        // Загружаем полный проект (с товарами), чтобы items были актуальны
        const { projectService } = await import('../utils/projectService');
        const fullProject = await projectService.getProjectById(project.id);
        console.log('DocumentsSubmission: Загружен проект:', {
          projectId: fullProject.id,
          itemsCount: fullProject.items?.length || 0,
          items: fullProject.items?.map(item => ({
            id: item.id,
            name: item.name,
            categoryId: item.categoryId,
            categoryIdType: typeof item.categoryId,
            categoryName: item.categoryName,
            supplierId: item.supplierId,
            channelsCount: item.channelsCount,
            dosingVolume: item.dosingVolume,
            autoclavable: item.autoclavable
          })),
          fullProjectItems: JSON.stringify(fullProject.items, null, 2)
        });
        setCurrentProject(fullProject);

        // Загружаем всех контрагентов, чтобы отфильтровать поставщиков
        const allContractors = await contractorService.getAllContractors();
        const supplierContractors = allContractors.filter(c =>
          c.role && Array.isArray(c.role) && c.role.includes('supplier')
        );
        setSuppliers(supplierContractors);
        
        // Загружаем категории товаров для получения supplier_ids
        const allCategories = await equipmentSectionsService.getSections();
        console.log('DocumentsSubmission: Загружены категории:', {
          count: allCategories.length,
          categories: allCategories.map(c => ({
            id: c.id,
            name: c.name,
            supplierIds: c.supplierIds,
            supplierIdsLength: c.supplierIds?.length || 0
          }))
        });
        setCategories(allCategories);
      } catch (e: any) {
        console.error('DocumentsSubmission: Ошибка загрузки данных:', e);
        setError(e?.message || 'Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };

    if (project.id) {
      loadFullProjectAndSuppliers();
    }
  }, [project.id]);

  const itemsWithSuppliers = useMemo(() => {
    const items: ProjectItem[] = currentProject.items || [];

    console.log('DocumentsSubmission: itemsWithSuppliers - начало обработки:', {
      itemsCount: items.length,
      items: items.map(item => ({
        name: item.name,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        supplierId: item.supplierId
      })),
      categoriesCount: categories.length,
      categories: categories.map(c => ({ id: c.id, name: c.name, supplierIds: c.supplierIds }))
    });

    return items.map((item) => {
      // Собираем ID поставщиков из разных источников
      const supplierIds = new Set<string>();
      let hasCategory = false;
      let categoryHasSuppliers = false;
      
      console.log('DocumentsSubmission: Обработка товара:', {
        itemName: item.name,
        itemCategoryId: item.categoryId,
        itemCategoryName: item.categoryName,
        itemSupplierId: item.supplierId
      });
      
      // 1. Поставщик, выбранный для конкретного товара
      if (item.supplierId) {
        supplierIds.add(item.supplierId);
        console.log('DocumentsSubmission: Добавлен поставщик товара:', item.supplierId);
      }
      
      // 2. Поставщики из категории товара (только если они выбраны в карточке категории)
      let category: EquipmentSection | undefined = undefined;
      
      if (item.categoryId) {
        // Ищем категорию по ID
        category = categories.find(c => c.id === item.categoryId);
        console.log('DocumentsSubmission: Поиск категории по ID:', {
          itemCategoryId: item.categoryId,
          categoryFound: !!category,
          categoryId: category?.id,
          categoryName: category?.name,
          categorySupplierIds: category?.supplierIds
        });
      } else {
        // Если categoryId отсутствует, пытаемся найти категорию по названию товара
        // Название товара может начинаться с названия категории (например, "Лабораторные дозаторы и пипетки (12 канал(ов), автоклавируемый)")
        const itemNameStart = item.name.split(' (')[0].trim(); // Берем часть до скобки
        category = categories.find(c => {
          const categoryNameLower = c.name.toLowerCase().trim();
          const itemNameStartLower = itemNameStart.toLowerCase().trim();
          return categoryNameLower === itemNameStartLower || itemNameStartLower.startsWith(categoryNameLower);
        });
        console.log('DocumentsSubmission: Поиск категории по названию товара:', {
          itemName: item.name,
          itemNameStart,
          categoryFound: !!category,
          categoryId: category?.id,
          categoryName: category?.name,
          categorySupplierIds: category?.supplierIds,
          allCategories: categories.map(c => c.name)
        });
      }
      
      if (category) {
        hasCategory = true;
        console.log('DocumentsSubmission: Найдена категория для товара:', {
          itemName: item.name,
          categoryId: category.id,
          categoryName: category.name,
          supplierIds: category.supplierIds,
          supplierIdsLength: category.supplierIds?.length || 0,
          supplierIdsType: typeof category.supplierIds,
          supplierIdsIsArray: Array.isArray(category.supplierIds)
        });
        // Добавляем только тех поставщиков, которые выбраны в карточке категории
        if (category.supplierIds && Array.isArray(category.supplierIds) && category.supplierIds.length > 0) {
          categoryHasSuppliers = true;
          category.supplierIds.forEach(id => {
            if (id) {
              supplierIds.add(id);
            }
          });
          console.log('DocumentsSubmission: Добавлены поставщики из категории:', Array.from(supplierIds));
        } else {
          console.log('DocumentsSubmission: В категории нет выбранных поставщиков');
        }
      } else {
        console.log('DocumentsSubmission: Категория не найдена для товара:', {
          itemName: item.name,
          categoryId: item.categoryId,
          categoryIdType: typeof item.categoryId,
          availableCategories: categories.map(c => ({ id: c.id, name: c.name, idType: typeof c.id }))
        });
      }
      
      // 3. Логика отображения:
      // - Если есть категория и в ней выбраны поставщики - показываем только их + поставщика товара (если есть)
      // - Если есть категория, но в ней нет выбранных поставщиков - не показываем поставщиков (даже если есть поставщик товара)
      // - Если нет категории, но есть выбранный поставщик для товара - показываем его
      // - Если нет категории и нет выбранного поставщика - показываем всех поставщиков
      let matchedSuppliers: Contractor[] = [];
      
      if (hasCategory) {
        // Если есть категория
        if (categoryHasSuppliers) {
          // Если в категории есть выбранные поставщики - показываем их + поставщика товара (если есть)
          matchedSuppliers = suppliers.filter(s => supplierIds.has(s.id));
        } else {
          // Если в категории нет выбранных поставщиков - не показываем никого
          matchedSuppliers = [];
        }
      } else {
        // Если нет категории
        if (item.supplierId) {
          // Если есть выбранный поставщик для товара - показываем его
          matchedSuppliers = suppliers.filter(s => supplierIds.has(s.id));
        } else {
          // Если нет ни категории, ни выбранного поставщика - показываем всех поставщиков
          matchedSuppliers = suppliers;
        }
      }

      console.log('DocumentsSubmission: Результат фильтрации поставщиков для товара:', {
        itemName: item.name,
        itemCategoryId: item.categoryId,
        itemCategoryName: item.categoryName,
        hasCategory,
        categoryHasSuppliers,
        itemSupplierId: item.supplierId,
        supplierIdsCount: supplierIds.size,
        supplierIdsArray: Array.from(supplierIds),
        matchedSuppliersCount: matchedSuppliers.length,
        matchedSupplierNames: matchedSuppliers.map(s => s.name),
        allSuppliersCount: suppliers.length
      });

      return {
        item,
        suppliers: matchedSuppliers,
      };
    });
  }, [currentProject.items, suppliers, categories]);

  const loadMessagesForContact = async (contactId: string, email: string) => {
    if (!email) return;
    try {
      setLoadingMessagesForContact(contactId);
      // Сначала синхронизируем по e-mail (подтягиваем новые письма)
      await apiClient.post('/mail/messages/sync-for-email', {
        email,
        limit: 50,
      });

      // Затем запрашиваем сохранённые сообщения по contactId
      const data = await apiClient.get<{
        messages: { subject: string | null; body: string | null; receivedAt: string }[];
      }>(`/mail/messages/by-contact/${contactId}?limit=10`);

      if (data && Array.isArray(data.messages)) {
        setContactMessages((prev) => ({
          ...prev,
          [contactId]: data.messages,
        }));
      }
    } catch (err) {
      console.error('Ошибка загрузки сообщений сотрудника:', err);
    } finally {
      setLoadingMessagesForContact(null);
    }
  };

  if (loading && !currentProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка данных проекта...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Ошибка</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={onBack}
          className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад к проектам
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Подача документов</h1>
            <p className="text-sm text-gray-500">
              Подготовка и подбор поставщиков для проекта &laquo;{currentProject.name}&raquo;
            </p>
          </div>
        </div>
      </div>

      {/* Информация о проекте */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <ClipboardList className="w-6 h-6 text-indigo-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Информация о проекте</h2>
        </div>
        <ProjectInfo project={currentProject} />
      </div>

      {/* Товары и поставщики */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <Package className="w-6 h-6 text-green-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Товары и возможные поставщики</h2>
        </div>

        {itemsWithSuppliers.length === 0 ? (
          <p className="text-gray-500 text-sm">Для данного проекта товары не указаны.</p>
        ) : (
          <div className="space-y-4">
            {itemsWithSuppliers.map(({ item, suppliers }, index) => (
              <div
                key={item.id || index}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
              >
                {/* Одна строка: Наименование, Количество, Заявленная стоимость */}
                <div className="flex flex-wrap items-baseline gap-4 text-sm font-medium text-gray-900 mb-2">
                  <span>{item.name}</span>
                  <span className="text-gray-700">
                    Количество:{' '}
                    <span className="font-semibold">{item.quantity}</span>
                  </span>
                  <span className="text-gray-700">
                    Заявленная стоимость:{' '}
                    <span className="font-semibold">
                      {item.declaredPrice.toLocaleString('ru-RU', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </span>
                </div>

                {/* Категория товара */}
                {item.categoryName && (
                  <div className="text-xs text-gray-600 mb-2">
                    <span className="font-semibold">Категория:</span> {item.categoryName}
                  </div>
                )}

                {/* Технические характеристики */}
                {(item.categoryId || item.channelsCount !== undefined || item.dosingVolume || 
                  item.volumeStep || item.dosingAccuracy || item.reproducibility !== undefined || 
                  item.autoclavable !== undefined || item.inRegistrySI) && (
                  <div className="mb-3 p-3 bg-white rounded border border-gray-200">
                    <div className="text-xs font-semibold text-gray-700 mb-2">Технические характеристики:</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
                      {item.channelsCount !== undefined && item.channelsCount !== null && (
                        <div>
                          <span className="font-medium">Количество каналов:</span> {item.channelsCount}
                        </div>
                      )}
                      {item.dosingVolume && (
                        <div>
                          <span className="font-medium">Объем дозирования:</span> {item.dosingVolume}
                        </div>
                      )}
                      {item.volumeStep && (
                        <div>
                          <span className="font-medium">Шаг установки объема дозы:</span> {item.volumeStep}
                        </div>
                      )}
                      {item.dosingAccuracy && (
                        <div>
                          <span className="font-medium">Точность дозирования:</span> {item.dosingAccuracy}
                        </div>
                      )}
                      {item.reproducibility && (
                        <div>
                          <span className="font-medium">Воспроизводимость:</span> {item.reproducibility}
                        </div>
                      )}
                      {item.autoclavable !== undefined && (
                        <div>
                          <span className="font-medium">Автоклавируемость:</span> {item.autoclavable ? 'Да' : 'Нет'}
                        </div>
                      )}
                      {item.inRegistrySI && (
                        <div>
                          <span className="font-medium">Наличие в реестре СИ:</span> Да
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Описание товара */}
                {item.description && (
                  <div className="text-xs text-gray-600 mb-3">
                    <span className="font-semibold">Описание:</span> {item.description}
                  </div>
                )}


                {/* Поставщики */}
                <div className="mt-4">
                  <div className="text-xs font-semibold text-gray-700 mb-2">
                    Поставщики
                  </div>
                  {itemsWithSuppliers.find(x => x.item === item)?.suppliers.length ? (
                    <div className="space-y-3">
                      {itemsWithSuppliers
                        .find(x => x.item === item)!
                        .suppliers.map((supplier) => (
                          <div
                            key={supplier.id}
                            className="bg-white border border-gray-200 rounded-md px-4 py-3"
                          >
                            <div className="flex items-start space-x-2">
                              <Building2 className="w-4 h-4 text-gray-400 mt-0.5" />
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">
                                  {supplier.name}
                                </div>
                                {supplier.address && (
                                  <div className="mt-0.5 text-xs text-gray-500">
                                    {supplier.address}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="mt-3 border-t border-gray-100 pt-3">
                              <div className="text-xs font-semibold text-gray-700 mb-2">
                                Сотрудники
                              </div>
                              {supplier.contacts && supplier.contacts.length > 0 ? (
                                <div className="space-y-2">
                                  {supplier.contacts.map((contact) => {
                                    return (
                                      <div
                                        key={contact.id}
                                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-gray-700 bg-gray-50 rounded px-3 py-2"
                                      >
                                        <div className="flex items-center space-x-2 flex-1">
                                          <User className="w-3 h-3 text-gray-400" />
                                          <div className="flex-1">
                                            <div className="font-medium">{contact.employeeName}</div>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                              {contact.phone && (
                                                <span className="inline-flex items-center space-x-1 text-gray-600">
                                                  <Phone className="w-3 h-3 text-gray-400" />
                                                  <span>{contact.phone}</span>
                                                </span>
                                              )}
                                              {contact.email && (
                                                <span className="inline-flex items-center space-x-1 text-gray-600">
                                                  <Mail className="w-3 h-3 text-gray-400" />
                                                  <span>{contact.email}</span>
                                                </span>
                                              )}
                                              {contact.comment && (
                                                <span className="inline-flex items-center space-x-1 text-gray-500">
                                                  <MessageSquare className="w-3 h-3" />
                                                  <span>{contact.comment}</span>
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        {/* Кнопка отправки запроса для конкретного сотрудника */}
                                        {contact.email && (
                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={async () => {
                                                try {
                                                  if (!contact.email) {
                                                    alert('У сотрудника не указан e-mail для отправки запроса.');
                                                    return;
                                                  }

                                                  const recipients = [{
                                                    email: contact.email,
                                                    fullName: contact.employeeName,
                                                  }];

                                                  const payload = {
                                                    projectId: currentProject.id,
                                                    itemId: item.id,
                                                    itemName: item.name,
                                                    quantity: item.quantity,
                                                    description: item.description || '',
                                                    userFullName: user?.fullName || 'Пользователь системы',
                                                    userPhone: mailSettings.defaultUserPhone,
                                                    recipients,
                                                  };

                                                  const result = await apiClient.post<any>('/mail/send-requests', payload);

                                                  if (result && Array.isArray(result.results)) {
                                                    const errors = result.results.filter((r: any) => r.status === 'error');
                                                    if (errors.length > 0) {
                                                      alert(
                                                        `Письмо не было отправлено. Подробнее смотрите в логах сервера.\nНеудавшийся адрес: ${errors
                                                          .map((e: any) => e.email)
                                                          .join(', ')}`
                                                      );
                                                    } else {
                                                      alert(`Почтовое сообщение успешно отправлено сотруднику ${contact.employeeName}.`);
                                                    }
                                                  } else {
                                                    alert('Запрос на отправку почты выполнен. Проверьте логи сервера для деталей.');
                                                  }
                                                } catch (e: any) {
                                                  console.error('Ошибка отправки почтового сообщения:', e);
                                                  alert(`Ошибка отправки почты: ${e?.message || 'Неизвестная ошибка'}`);
                                                }
                                              }}
                                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                                            >
                                              <Send className="w-3 h-3 mr-1" />
                                              Отправить запрос
                                            </button>
                                          </div>
                                        )}
                                        {/* Блок входящих писем от сотрудника */}
                                        {contact.email && contact.id && (
                                          <div className="mt-2 w-full">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                loadMessagesForContact(contact.id!, contact.email!)
                                              }
                                              className="inline-flex items-center px-2 py-1 text-[11px] font-medium rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors"
                                            >
                                              {loadingMessagesForContact === contact.id
                                                ? 'Загрузка сообщений...'
                                                : 'Показать ответы по e-mail'}
                                            </button>
                                            {contactMessages[contact.id] &&
                                              contactMessages[contact.id].length > 0 && (
                                                <div className="mt-1 space-y-1 bg-white border border-gray-200 rounded px-2 py-1 max-h-40 overflow-y-auto">
                                                  {contactMessages[contact.id].map((msg, idx) => (
                                                    <div
                                                      key={`${contact.id}-${idx}`}
                                                      className="border-b last:border-b-0 border-gray-100 pb-1 mb-1 last:pb-0 last:mb-0"
                                                    >
                                                      <div className="text-[10px] text-gray-500">
                                                        {new Date(msg.receivedAt).toLocaleString(
                                                          'ru-RU'
                                                        )}
                                                      </div>
                                                      {msg.subject && (
                                                        <div className="text-[11px] font-semibold text-gray-800">
                                                          {msg.subject}
                                                        </div>
                                                      )}
                                                      {msg.body && (
                                                        <div className="text-[11px] text-gray-700 whitespace-pre-wrap">
                                                          {msg.body.length > 400
                                                            ? `${msg.body.slice(0, 400)}…`
                                                            : msg.body}
                                                        </div>
                                                      )}
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400">
                                  Контакты не указаны.
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">
                      Поставщики не найдены.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentsSubmission;


