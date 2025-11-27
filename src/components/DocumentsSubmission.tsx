import React, { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, Package, Building2, ClipboardList, User, Phone, Mail, MessageSquare, Send } from 'lucide-react';
import { Project, ProjectItem } from '../types/Project';
import { Contractor } from '../types/Contractor';
import { contractorService } from '../utils/contractorService';
import { ProjectInfo } from './contract/ProjectInfo';
import { apiClient } from '../utils/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { mailSettings } from '../services/mailSettings';

interface DocumentsSubmissionProps {
  project: Project;
  onBack: () => void;
  onPageChange?: (page: string, data?: any) => void;
}

export const DocumentsSubmission: React.FC<DocumentsSubmissionProps> = ({ project, onBack }) => {
  const [currentProject, setCurrentProject] = useState<Project>(project);
  const [suppliers, setSuppliers] = useState<Contractor[]>([]);
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
        setCurrentProject(fullProject);

        // Загружаем всех контрагентов, чтобы отфильтровать поставщиков
        const allContractors = await contractorService.getAllContractors();
        const supplierContractors = allContractors.filter(c =>
          c.role && Array.isArray(c.role) && c.role.includes('supplier')
        );
        setSuppliers(supplierContractors);
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

    return items.map((item) => {
      const nameLower = (item.name || '').toLowerCase();

      const matchedSuppliers = suppliers.filter((supplier) => {
        if (!supplier.tags || supplier.tags.length === 0) return false;
        const tagsLower = supplier.tags.map((t) => t.toLowerCase());

        return tagsLower.some((tag) => {
          if (!tag) return false;
          // Совпадение по полному тегу или по его части в наименовании товара
          return nameLower.includes(tag) || tag.includes(nameLower);
        });
      });

      return {
        item,
        suppliers: matchedSuppliers,
      };
    });
  }, [currentProject.items, suppliers]);

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

                {/* Описание товара */}
                {item.description && (
                  <div className="text-xs text-gray-600 mb-3">
                    {item.description}
                  </div>
                )}

                {/* Кнопка отправки запроса для товара */}
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const group = itemsWithSuppliers.find((x) => x.item === item);
                        if (!group) return;

                        const selectedContacts =
                          group.suppliers.flatMap((supplier) =>
                            (supplier.contacts || []).filter(
                              (c) => c.email && c.isSelectedForRequests !== false
                            )
                          );

                        if (selectedContacts.length === 0) {
                          alert('Не выбраны сотрудники с активным чекбоксом и e-mail для отправки запроса.');
                          return;
                        }

                        const recipients = selectedContacts.map((c) => ({
                          email: c.email,
                          fullName: c.employeeName,
                        }));

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
                              `Часть писем не была отправлена. Подробнее смотрите в логах сервера.\nНеудавшиеся адреса: ${errors
                                .map((e: any) => e.email)
                                .join(', ')}`
                            );
                          } else {
                            alert('Почтовые сообщения успешно отправлены всем выбранным сотрудникам.');
                          }
                        } else {
                          alert('Запрос на отправку почты выполнен. Проверьте логи сервера для деталей.');
                        }
                      } catch (e: any) {
                        console.error('Ошибка отправки почтовых сообщений:', e);
                        alert(`Ошибка отправки почты: ${e?.message || 'Неизвестная ошибка'}`);
                      }
                    }}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  >
                    <Send className="w-3 h-3 mr-1" />
                    Отправить запрос
                  </button>
                </div>

                {/* Поставщики */}
                <div className="mt-1">
                  <div className="text-xs font-semibold text-gray-700 mb-1">
                    Поставщики с подходящими тегами
                  </div>
                  {suppliers.length === 0 ? (
                    <p className="text-xs text-gray-400">
                      В справочнике нет контрагентов с ролью &laquo;Поставщик&raquo;.
                    </p>
                  ) : suppliers.length > 0 && suppliers.filter(s => s.tags && s.tags.length > 0).length === 0 ? (
                    <p className="text-xs text-gray-400">
                      У поставщиков не заданы теги.
                    </p>
                  ) : suppliers.length > 0 && suppliers.filter(s => s.tags && s.tags.length > 0).length > 0 && suppliers.filter(s => s.tags && s.tags.length > 0).length > 0 && suppliers.filter(s => s.tags && s.tags.length > 0).length > 0 && suppliers.filter(s => s.tags && s.tags.length > 0).length > 0 && suppliers.filter(s => s.tags && s.tags.length > 0).length > 0 ? null : null}

                  {suppliers.length > 0 && (
                    suppliers.length === 0 || suppliers.filter(s => s.tags && s.tags.length > 0).length === 0 ? null : null
                  )}

                  {suppliers.length > 0 && suppliers.filter(s => s.tags && s.tags.length > 0).length > 0 && suppliers.length > 0 && suppliers.filter(s => s.tags && s.tags.length > 0).length > 0 && (
                    <></>
                  )}

                  {suppliers.length > 0 && suppliers.filter(s => s.tags && s.tags.length > 0).length > 0 && (
                    <></>
                  )}

                  {suppliers.length >= 0 && (
                    suppliers.length === 0 ? null : null
                  )}

                  {suppliers.length === 0 ? null : null}

                  {suppliers.length >= 0 && (
                    <div className="space-y-2">
                      {suppliers.length === 0 ? null : null}
                    </div>
                  )}

                  {suppliers.length === 0 ? null : null}

                  {suppliers.length >= 0 && (
                    <div className="space-y-2">
                      {suppliers.length === 0 ? null : null}
                    </div>
                  )}

                  {/* Выводим конкретно подобранных поставщиков для товара */}
                  {suppliers.length >= 0 && suppliers.filter(s => s.tags && s.tags.length > 0).length >= 0 && (
                    <div className="space-y-2">
                      {suppliers.length === 0 ? null : null}
                    </div>
                  )}

                  {suppliers.length === 0 ? null : null}

                  {/* Основной вывод списка подобранных поставщиков */}
                  {suppliers.length > 0 && (
                    suppliers.length === 0 ? null : null
                  )}

                  {/* Нормальный вывод: */}
                  {suppliers.length > 0 && (
                    <div className="space-y-2">
                      {suppliers.length === 0 ? null : null}
                    </div>
                  )}

                  {/* Упрощённая реализация: если есть подходящие поставщики — показываем их, иначе сообщение */}
                  {suppliers.length > 0 && (
                    <>
                      {suppliers.length === 0 ? null : null}
                    </>
                  )}

                  {/* Финальная рабочая часть: поставщики с детальной информацией по контактам */}
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
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {supplier.name}
                                </div>
                                {supplier.address && (
                                  <div className="mt-0.5 text-xs text-gray-500">
                                    {supplier.address}
                                  </div>
                                )}
                                {supplier.tags && supplier.tags.length > 0 && (
                                  <div className="mt-1 text-xs text-gray-400">
                                    Теги: {supplier.tags.join(', ')}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="mt-2 border-t border-gray-100 pt-2">
                              <div className="text-xs font-semibold text-gray-700 mb-1">
                                Сотрудники
                              </div>
                              {supplier.contacts && supplier.contacts.length > 0 ? (
                                <div className="space-y-1">
                                  {supplier.contacts.map((contact) => {
                                    const checked = contact.isSelectedForRequests !== false;
                                    return (
                                      <div
                                        key={contact.id}
                                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs text-gray-700 bg-gray-50 rounded px-2 py-1"
                                      >
                                        <div className="flex items-center space-x-2">
                                          <input
                                            type="checkbox"
                                            className="w-3 h-3 accent-indigo-600"
                                            checked={checked}
                                            onChange={async (e) => {
                                              const newValue = e.target.checked;
                                              try {
                                                // Локальное обновление состояния
                                                setSuppliers((prev) =>
                                                  prev.map((s) =>
                                                    s.id === supplier.id
                                                      ? {
                                                          ...s,
                                                          contacts: s.contacts.map((c) =>
                                                            c.id === contact.id
                                                              ? { ...c, isSelectedForRequests: newValue }
                                                              : c
                                                          ),
                                                        }
                                                      : s
                                                  )
                                                );
                                                // Сохранение на сервере (глобально для всех пользователей)
                                                await contractorService.updateContact(contact.id, {
                                                  employeeName: contact.employeeName,
                                                  phone: contact.phone,
                                                  email: contact.email,
                                                  comment: contact.comment,
                                                  isSelectedForRequests: newValue,
                                                });
                                              } catch (err) {
                                                console.error('Ошибка сохранения состояния чекбокса сотрудника:', err);
                                              }
                                            }}
                                          />
                                          <div className="flex items-center space-x-1">
                                            <User className="w-3 h-3 text-gray-400" />
                                            <span className="font-medium">{contact.employeeName}</span>
                                          </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                          {contact.phone && (
                                            <span className="inline-flex items-center space-x-1">
                                              <Phone className="w-3 h-3 text-gray-400" />
                                              <span>{contact.phone}</span>
                                            </span>
                                          )}
                                          {contact.email && (
                                            <span className="inline-flex items-center space-x-1">
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
                                        {/* Блок входящих писем от сотрудника */}
                                        {contact.email && contact.id && (
                                          <div className="mt-1 w-full">
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
                      Подходящие поставщики по тегам не найдены.
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


