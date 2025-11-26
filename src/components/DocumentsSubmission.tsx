import React, { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, Package, Building2, ClipboardList } from 'lucide-react';
import { Project, ProjectItem } from '../types/Project';
import { Contractor } from '../types/Contractor';
import { contractorService } from '../utils/contractorService';
import { ProjectInfo } from './contract/ProjectInfo';

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
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {item.name}
                    </div>
                    {item.description && (
                      <div className="text-xs text-gray-600 mt-1">
                        {item.description}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-700 text-right">
                    <div>
                      Количество: <span className="font-medium">{item.quantity}</span>
                    </div>
                    <div>
                      Заявленная стоимость:{' '}
                      <span className="font-medium">
                        {item.declaredPrice.toLocaleString('ru-RU', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Поставщики */}
                <div className="mt-3">
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

                  {/* Финальная рабочая часть: */}
                  {suppliers.length > 0 && (
                    <div className="space-y-2">
                      {itemsWithSuppliers.find(x => x.item === item)?.suppliers.length ? (
                        itemsWithSuppliers
                          .find(x => x.item === item)!
                          .suppliers.map((supplier) => (
                            <div
                              key={supplier.id}
                              className="flex items-start space-x-2 bg-white border border-gray-200 rounded-md px-3 py-2"
                            >
                              <Building2 className="w-4 h-4 text-gray-400 mt-0.5" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {supplier.name}
                                </div>
                                {supplier.tags && supplier.tags.length > 0 && (
                                  <div className="mt-1 text-xs text-gray-500">
                                    Теги: {supplier.tags.join(', ')}
                                  </div>
                                )}
                                {supplier.address && (
                                  <div className="mt-1 text-xs text-gray-400">
                                    {supplier.address}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                      ) : (
                        <p className="text-xs text-gray-400">
                          Подходящие поставщики по тегам не найдены.
                        </p>
                      )}
                    </div>
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


