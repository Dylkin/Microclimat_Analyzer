import React, { useState, useEffect, useMemo } from 'react';
import { Building, Car, Refrigerator, Snowflake, CheckSquare, Square, FileText, ExternalLink, MoreVertical, Eye, Play, BarChart3 } from 'lucide-react';
import { QualificationObject, QualificationObjectTypeLabels } from '../../types/QualificationObject';
import { qualificationObjectService } from '../../utils/qualificationObjectService';
import { QualificationProtocolWithDocument } from '../../utils/qualificationProtocolService';
import { QualificationObjectForm } from '../QualificationObjectForm';
import { objectTypeMapping } from '../../utils/objectTypeMapping';
import { projectService } from '../../utils/projectService';
// import { QualificationObjectsTable } from '../QualificationObjectsTable';

interface QualificationObjectsCRUDProps {
  contractorId: string;
  contractorName: string;
  projectId?: string;
  project?: any; // Добавляем полный объект проекта
  projectQualificationObjects?: Array<{
    id: string;
    projectId: string;
    qualificationObjectId: string;
    qualificationObjectName?: string;
    qualificationObjectType?: string;
    createdAt: Date;
  }>;
  qualificationProtocols?: QualificationProtocolWithDocument[];
  isCheckboxesBlocked?: boolean;
  onPageChange?: (page: string, data?: any) => void;
  onQualificationObjectStateChange?: (isOpen: boolean) => void;
  showExecuteButton?: boolean; // Показывать кнопку "Выполнить" для страницы "Проведение испытаний"
  contextPage?: string; // Для диагностики/контекстного поведения
}

export const QualificationObjectsCRUD: React.FC<QualificationObjectsCRUDProps> = ({ 
  contractorId, 
  // contractorName,
  projectId,
  project,
  projectQualificationObjects = [],
  qualificationProtocols = [],
  isCheckboxesBlocked = false,
  onPageChange,
  onQualificationObjectStateChange,
  showExecuteButton = false,
  contextPage
}) => {
  const [objects, setObjects] = useState<QualificationObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingObject, setEditingObject] = useState<QualificationObject | null>(null);
  const [viewingObject, setViewingObject] = useState<QualificationObject | null>(null);
  const [objectMode, setObjectMode] = useState<'view' | 'edit' | null>(null);
  const [loadingObject, setLoadingObject] = useState(false);
  // const [showForm, setShowForm] = useState(false);
  const [selectedObjects, setSelectedObjects] = useState<Set<string>>(new Set());

  const canShowDataAnalysisIcon = Boolean(onPageChange && project);
  const showDataAnalysisIcon = canShowDataAnalysisIcon && contextPage !== 'contract_negotiation';
  const projectSelectedCount = projectQualificationObjects.length;
  const filterToProjectSelection =
    contextPage === 'testing_execution' || contextPage === 'creating_report';
  const showSelectionColumn = !filterToProjectSelection;

  // Отслеживание изменений состояния объекта квалификации
  useEffect(() => {
    const isObjectOpen = editingObject !== null || viewingObject !== null;
    if (onQualificationObjectStateChange) {
      onQualificationObjectStateChange(isObjectOpen);
    }
  }, [editingObject, viewingObject, onQualificationObjectStateChange]);

  // Получение протоколов для объекта квалификации по типу
  const getProtocolsForObjectType = (objectType: string): QualificationProtocolWithDocument[] => {
    // Преобразуем русский тип объекта в английский для сравнения с протоколами из БД
    const englishType = objectTypeMapping[objectType] || objectType;
    
    const filtered = qualificationProtocols.filter(protocol => {
      // Протоколы из БД имеют objectType в английском формате (room, vehicle, etc.)
      // Объекты квалификации имеют type в русском формате (помещение, автомобиль, etc.)
      // Сравниваем оба варианта для совместимости
      return protocol.objectType === englishType || protocol.objectType === objectType;
    });
    
    return filtered;
  };

  // Загрузка объектов квалификации
  const loadObjects = async () => {
    setLoading(true);
    setError(null);

    try {
      const shouldScopeToProject = Boolean(projectId && filterToProjectSelection);
      const data = await qualificationObjectService.getQualificationObjectsByContractor(
        contractorId,
        shouldScopeToProject ? projectId : undefined
      );
      setObjects(data);
    } catch (error) {
      console.error('Ошибка загрузки объектов:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadObjects();
  }, [contractorId]);

  // Инициализация выбранных объектов на основе данных проекта
  // Используем строку ID для стабильности зависимостей
  const projectQualificationObjectIds = useMemo(() => {
    return projectQualificationObjects.map(pqo => pqo.qualificationObjectId).sort().join(',');
  }, [projectQualificationObjects]);

  const projectQualificationObjectIdSet = useMemo(() => {
    return new Set(projectQualificationObjects.map((pqo) => pqo.qualificationObjectId));
  }, [projectQualificationObjectIds, projectQualificationObjects]);

  const displayedObjects = useMemo(() => {
    if (!filterToProjectSelection) return objects;
    return objects.filter((o) => projectQualificationObjectIdSet.has(o.id));
  }, [filterToProjectSelection, objects, projectQualificationObjectIdSet]);

  useEffect(() => {
    if (projectQualificationObjects.length > 0) {
      const selectedIds = new Set(projectQualificationObjects.map(pqo => pqo.qualificationObjectId));
      setSelectedObjects(selectedIds);
    }
  }, [projectQualificationObjectIds, projectQualificationObjects]);

  const selectedObjectIdsKey = useMemo(() => {
    return Array.from(selectedObjects).sort().join(',');
  }, [selectedObjects]);

  useEffect(() => {
    // Сохраняем выбранные объекты в проект только на странице "Согласование договора"
    if (contextPage !== 'contract_negotiation') return;
    if (!projectId) return;
    if (isCheckboxesBlocked) return;

    const selectedIdsSorted = selectedObjectIdsKey;
    // Если выбранные ID совпадают с тем, что уже пришло из проекта — ничего не делаем
    if (selectedIdsSorted === projectQualificationObjectIds) return;

    (async () => {
      try {
        await projectService.updateProject(projectId, {
          qualificationObjectIds: Array.from(selectedObjects),
        });
      } catch {
        // ignore
      }
    })();
  }, [contextPage, projectId, isCheckboxesBlocked, selectedObjectIdsKey, projectQualificationObjectIds]);

  // Создание нового объекта
  // const handleCreate = async (object: QualificationObject) => {
  //   setObjects(prev => [object, ...prev]);
  // };

  // Обновление объекта
  const handleUpdate = async (object: QualificationObject): Promise<QualificationObject> => {
    try {
      // Обновляем объект в базе данных
      const updatedObject = await qualificationObjectService.updateQualificationObject(
        object.id,
        object,
        projectId
      );
      
      // Обновляем локальное состояние
      setObjects(prev => prev.map(obj => obj.id === object.id ? updatedObject : obj));
      // НЕ закрываем форму автоматически - пользователь остается на той же странице
      
      console.log('Объект квалификации успешно обновлен в БД:', updatedObject);
      return updatedObject;
    } catch (error) {
      console.error('Ошибка обновления объекта квалификации:', error);
      alert(`Ошибка сохранения изменений: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      throw error; // Пробрасываем ошибку дальше
    }
  };

  // Удаление объекта
  // const handleDelete = async (id: string) => {
  //   if (!confirm('Вы уверены, что хотите удалить этот объект квалификации?')) {
  //     return;
  //   }

  //   try {
  //     await qualificationObjectService.deleteQualificationObject(id);
  //     setObjects(prev => prev.filter(obj => obj.id !== id));
  //   } catch (error) {
  //     console.error('Ошибка удаления объекта:', error);
  //     alert(`Ошибка удаления объекта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
  //   }
  // };

  // Обработка выбора объекта
  const handleObjectSelect = (objectId: string) => {
    // Блокируем выбор, если чекбоксы заблокированы
    if (isCheckboxesBlocked) {
      return;
    }
    
    setSelectedObjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(objectId)) {
        newSet.delete(objectId);
      } else {
        newSet.add(objectId);
      }
      return newSet;
    });
  };

  // Обработка выбора всех объектов
  const handleSelectAll = () => {
    // Блокируем выбор всех, если чекбоксы заблокированы
    if (isCheckboxesBlocked) {
      return;
    }
    
    if (selectedObjects.size === displayedObjects.length) {
      setSelectedObjects(new Set());
    } else {
      setSelectedObjects(new Set(displayedObjects.map(obj => obj.id)));
    }
  };

  // Получение иконки для типа объекта
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'помещение':
        return <Building className="w-5 h-5" />;
      case 'автомобиль':
        return <Car className="w-5 h-5" />;
      case 'холодильная_камера':
        return <Refrigerator className="w-5 h-5" />;
      case 'холодильник':
      case 'морозильник':
        return <Snowflake className="w-5 h-5" />;
      default:
        return <Building className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Object Form - отображается только форма, если открыта */}
      {(editingObject || viewingObject) ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {viewingObject ? 'Просмотр объекта квалификации' : 'Редактировать объект квалификации'}
            </h3>
            <button
              onClick={() => {
                setEditingObject(null);
                setViewingObject(null);
                setObjectMode(null);
              }}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Назад
            </button>
          </div>
          <QualificationObjectForm
            contractorId={contractorId}
            contractorAddress=""
            initialData={editingObject || viewingObject || undefined}
            onSubmit={handleUpdate}
            onCancel={() => {
              setEditingObject(null);
              setViewingObject(null);
              setObjectMode(null);
            }}
            hideTypeSelection={true}
            projectId={projectId}
            project={project}
            onPageChange={onPageChange}
            mode={viewingObject ? 'view' : (objectMode || 'edit')}
            showCloseButtonInView={false}
            hideWorkSchedule={!showExecuteButton}
          />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Объекты квалификации</h2>
          {selectedObjects.size > 0 && (
            <p className="text-sm text-indigo-600 mt-1">
              {isCheckboxesBlocked 
                ? `Отображаются выбранные объекты: ${selectedObjects.size}`
                : `Выбрано объектов: ${selectedObjects.size}`
              }
            </p>
          )}
        </div>
      </div>

      {/* Сообщение о блокировке */}
      {isCheckboxesBlocked && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ Выбор объектов квалификации заблокирован после согласования договора. Отображаются только выбранные объекты.
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Загрузка объектов...</p>
        </div>
      )}

      {/* Objects Table with Checkboxes */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Загрузка объектов...</p>
        </div>
      ) : displayedObjects.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {showSelectionColumn && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={handleSelectAll}
                      disabled={isCheckboxesBlocked}
                      className={`flex items-center space-x-2 ${
                        isCheckboxesBlocked 
                          ? 'cursor-not-allowed opacity-50' 
                          : 'hover:text-gray-700'
                      }`}
                      title={isCheckboxesBlocked ? 'Выбор объектов заблокирован после согласования договора' : ''}
                    >
                      {selectedObjects.size === displayedObjects.length ? (
                        <CheckSquare className={`w-4 h-4 ${isCheckboxesBlocked ? 'text-gray-400' : 'text-indigo-600'}`} />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                      <span>Выбрать все</span>
                    </button>
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Тип
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Наименование
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Детали
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Протоколы
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayedObjects.map((obj) => (
                <tr key={obj.id} className="hover:bg-gray-50">
                  {showSelectionColumn && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isCheckboxesBlocked ? (
                        <div className="flex items-center space-x-2">
                          {selectedObjects.has(obj.id) ? (
                            <CheckSquare className="w-4 h-4 text-green-600" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400" />
                          )}
                          <span className="text-sm text-gray-500">
                            {selectedObjects.has(obj.id) ? 'Выбран' : 'Не выбран'}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleObjectSelect(obj.id)}
                          className="flex items-center space-x-2 hover:text-gray-700"
                          title="Выбрать объект"
                        >
                          {selectedObjects.has(obj.id) ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getTypeIcon(obj.type)}
                      <span className="text-sm font-medium text-gray-900">
                        {QualificationObjectTypeLabels[obj.type]}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {obj.name || obj.vin || obj.serialNumber || 'Без названия'}
                    </div>
                    <div className="text-xs text-gray-500">
                      Создан: {obj.createdAt?.toLocaleDateString('ru-RU') || 'Неизвестно'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {obj.type === 'помещение' && (
                        <div>
                          <div>Площадь: {obj.area || 'Не указана'} м²</div>
                          {obj.address && <div>Адрес: {obj.address}</div>}
                        </div>
                      )}
                      {obj.type === 'автомобиль' && (
                        <div>
                          <div>VIN: {obj.vin || 'Не указан'}</div>
                          <div>Регистрационный номер: {obj.registrationNumber || 'Не указан'}</div>
                        </div>
                      )}
                      {(obj.type === 'холодильник' || obj.type === 'морозильник' || obj.type === 'холодильная_камера' || obj.type === 'термоконтейнер') && (
                        <div>
                          <div>Серийный номер: {obj.serialNumber || 'Не указан'}</div>
                          <div>Производитель: {obj.manufacturer || 'Не указан'}</div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      {(() => {
                        const objectProtocols = getProtocolsForObjectType(obj.type);
                        if (objectProtocols.length === 0) {
                          return (
                            <div className="text-sm text-gray-500 italic">
                              Протоколы не загружены
                            </div>
                          );
                        }
                        return objectProtocols.map((protocol) => {
                          // Проверяем наличие документа
                          if (!protocol.document || !protocol.document.fileUrl) {
                            return (
                              <div key={protocol.id} className="text-sm text-gray-500 italic">
                                Протокол без файла
                              </div>
                            );
                          }
                          
                          return (
                            <div key={protocol.id} className="flex items-start space-x-2">
                              <FileText className="w-4 h-4 text-blue-600 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <a
                                  href={protocol.document.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1"
                                  title={`Открыть протокол: ${protocol.document.fileName || 'Протокол'}`}
                                >
                                  <span className="truncate max-w-32">
                                    {protocol.document.fileName || 'Протокол'}
                                  </span>
                                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                </a>
                                {protocol.document.uploadedAt && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Загружен: {new Date(protocol.document.uploadedAt).toLocaleDateString('ru-RU')}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={async () => {
                          try {
                            setLoadingObject(true);
                            // Загружаем полные данные объекта из API перед открытием просмотра
                            const fullObject = await qualificationObjectService.getQualificationObjectById(obj.id, projectId);
                            setViewingObject(fullObject);
                            setEditingObject(null); // Очищаем редактирование, если было открыто
                            setObjectMode('view');
                          } catch (error) {
                            console.error('Ошибка загрузки объекта квалификации:', error);
                            alert(`Ошибка загрузки объекта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
                          } finally {
                            setLoadingObject(false);
                          }
                        }}
                        disabled={loadingObject} // Блокируем кнопку во время загрузки
                        className={`${loadingObject ? 'opacity-50 cursor-wait' : 'text-blue-600 hover:text-blue-900'}`}
                        title={loadingObject ? 'Загрузка...' : 'Просмотреть объект квалификации'}
                      >
                        {loadingObject ? (
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                      {showExecuteButton && (
                        <button
                          onClick={async () => {
                            try {
                              setLoadingObject(true);
                              // Загружаем полные данные объекта из API перед открытием в режиме редактирования (Выполнить)
                              const fullObject = await qualificationObjectService.getQualificationObjectById(obj.id, projectId);
                              setEditingObject(fullObject);
                              setViewingObject(null);
                              setObjectMode('edit');
                            } catch (error) {
                              console.error('Ошибка загрузки объекта квалификации:', error);
                              alert(`Ошибка загрузки объекта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
                            } finally {
                              setLoadingObject(false);
                            }
                          }}
                          disabled={loadingObject}
                          className={`${
                            loadingObject
                              ? 'opacity-50 cursor-wait'
                              : 'text-green-600 hover:text-green-900'
                          }`}
                          title={loadingObject ? 'Загрузка...' : 'Выполнить - открыть план графика и документы'}
                        >
                          {loadingObject ? (
                            <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      {showDataAnalysisIcon && (
                        <button
                          onClick={() => {
                            if (onPageChange && project) {
                              onPageChange('data_analysis', {
                                project: project,
                                qualificationObjectId: obj.id
                              });
                            }
                          }}
                          className="text-purple-600 hover:text-purple-900"
                          title="Анализ данных"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">Объекты квалификации не найдены</p>
        </div>
      )}
        </>
      )}
    </div>
  );
};