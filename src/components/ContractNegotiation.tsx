import React, { useState, useEffect } from 'react';
import { ArrowLeft, Building2, Calendar, Save, Edit2, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Project } from '../types/Project';
import { Contractor } from '../types/Contractor';
import { QualificationObject, QualificationObjectTypeLabels, UpdateQualificationObjectData } from '../types/QualificationObject';
import { contractorService } from '../utils/contractorService';
import { qualificationObjectService } from '../utils/qualificationObjectService';
import { projectService } from '../utils/projectService';

interface ContractNegotiationProps {
  project: Project;
  onBack: () => void;
}

export const ContractNegotiation: React.FC<ContractNegotiationProps> = ({ project, onBack }) => {
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [qualificationObjects, setQualificationObjects] = useState<QualificationObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingObject, setEditingObject] = useState<string | null>(null);
  const [editObjectData, setEditObjectData] = useState<UpdateQualificationObjectData>({});
  const [operationLoading, setOperationLoading] = useState(false);

  // Вычисляем примерную дату завершения (дата создания + 7 дней)
  const estimatedCompletionDate = new Date(project.createdAt);
  estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + 7);

  // Загрузка данных
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Загружаем данные контрагента
        if (contractorService.isAvailable()) {
          const contractorsData = await contractorService.getAllContractors();
          const projectContractor = contractorsData.find(c => c.id === project.contractorId);
          setContractor(projectContractor || null);
        }

        // Загружаем объекты квалификации проекта
        if (qualificationObjectService.isAvailable()) {
          const allObjects = await qualificationObjectService.getAllQualificationObjects();
          const projectObjectIds = project.qualificationObjects.map(obj => obj.qualificationObjectId);
          const projectObjects = allObjects.filter(obj => projectObjectIds.includes(obj.id));
          setQualificationObjects(projectObjects);
        }
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [project]);

  // Начало редактирования объекта квалификации
  const handleEditObject = (obj: QualificationObject) => {
    setEditObjectData({
      name: obj.name,
      address: obj.address,
      area: obj.area,
      climateSystem: obj.climateSystem,
      vin: obj.vin,
      registrationNumber: obj.registrationNumber,
      bodyVolume: obj.bodyVolume,
      inventoryNumber: obj.inventoryNumber,
      chamberVolume: obj.chamberVolume,
      serialNumber: obj.serialNumber
    });
    setEditingObject(obj.id);
  };

  // Сохранение изменений объекта квалификации
  const handleSaveObject = async () => {
    if (!editingObject) return;

    setOperationLoading(true);
    try {
      const updatedObject = await qualificationObjectService.updateQualificationObject(
        editingObject,
        editObjectData
      );
      
      setQualificationObjects(prev => 
        prev.map(obj => obj.id === editingObject ? updatedObject : obj)
      );
      
      setEditingObject(null);
      setEditObjectData({});
      alert('Объект квалификации успешно обновлен');
    } catch (error) {
      console.error('Ошибка обновления объекта квалификации:', error);
      alert(`Ошибка обновления: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  // Отмена редактирования
  const handleCancelEdit = () => {
    setEditingObject(null);
    setEditObjectData({});
  };

  // Рендер полей в зависимости от типа объекта
  const renderObjectFields = (obj: QualificationObject) => {
    if (editingObject !== obj.id) {
      // Режим просмотра
      return (
        <div className="space-y-2">
          {obj.name && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Наименование:</span>
              <span className="ml-2 text-gray-900">{obj.name}</span>
            </div>
          )}
          {obj.address && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Адрес:</span>
              <span className="ml-2 text-gray-900">{obj.address}</span>
            </div>
          )}
          {obj.area && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Площадь:</span>
              <span className="ml-2 text-gray-900">{obj.area} м²</span>
            </div>
          )}
          {obj.climateSystem && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Климатическая установка:</span>
              <span className="ml-2 text-gray-900">{obj.climateSystem}</span>
            </div>
          )}
          {obj.vin && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">VIN:</span>
              <span className="ml-2 text-gray-900">{obj.vin}</span>
            </div>
          )}
          {obj.registrationNumber && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Рег. номер:</span>
              <span className="ml-2 text-gray-900">{obj.registrationNumber}</span>
            </div>
          )}
          {obj.bodyVolume && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Объем кузова:</span>
              <span className="ml-2 text-gray-900">{obj.bodyVolume} м³</span>
            </div>
          )}
          {obj.inventoryNumber && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Инв. номер:</span>
              <span className="ml-2 text-gray-900">{obj.inventoryNumber}</span>
            </div>
          )}
          {obj.chamberVolume && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Объем камеры:</span>
              <span className="ml-2 text-gray-900">{obj.chamberVolume} м³</span>
            </div>
          )}
          {obj.serialNumber && (
            <div className="text-sm">
              <span className="font-medium text-gray-700">Серийный номер:</span>
              <span className="ml-2 text-gray-900">{obj.serialNumber}</span>
            </div>
          )}
        </div>
      );
    }

    // Режим редактирования
    return (
      <div className="space-y-3">
        {/* Поля в зависимости от типа объекта */}
        {(obj.type === 'помещение' || obj.type === 'холодильная_камера') && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Наименование</label>
            <input
              type="text"
              value={editObjectData.name || ''}
              onChange={(e) => setEditObjectData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        )}

        {obj.type === 'помещение' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Адрес</label>
              <input
                type="text"
                value={editObjectData.address || ''}
                onChange={(e) => setEditObjectData(prev => ({ ...prev, address: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Площадь (м²)</label>
              <input
                type="number"
                step="0.01"
                value={editObjectData.area || ''}
                onChange={(e) => setEditObjectData(prev => ({ ...prev, area: parseFloat(e.target.value) || undefined }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </>
        )}

        {obj.type === 'автомобиль' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">VIN номер</label>
              <input
                type="text"
                value={editObjectData.vin || ''}
                onChange={(e) => setEditObjectData(prev => ({ ...prev, vin: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Рег. номер</label>
              <input
                type="text"
                value={editObjectData.registrationNumber || ''}
                onChange={(e) => setEditObjectData(prev => ({ ...prev, registrationNumber: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Объем кузова (м³)</label>
              <input
                type="number"
                step="0.01"
                value={editObjectData.bodyVolume || ''}
                onChange={(e) => setEditObjectData(prev => ({ ...prev, bodyVolume: parseFloat(e.target.value) || undefined }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </>
        )}

        {obj.type === 'холодильная_камера' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Инв. номер</label>
              <input
                type="text"
                value={editObjectData.inventoryNumber || ''}
                onChange={(e) => setEditObjectData(prev => ({ ...prev, inventoryNumber: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Объем камеры (м³)</label>
              <input
                type="number"
                step="0.01"
                value={editObjectData.chamberVolume || ''}
                onChange={(e) => setEditObjectData(prev => ({ ...prev, chamberVolume: parseFloat(e.target.value) || undefined }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </>
        )}

        {(obj.type === 'холодильник' || obj.type === 'морозильник') && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Серийный номер</label>
              <input
                type="text"
                value={editObjectData.serialNumber || ''}
                onChange={(e) => setEditObjectData(prev => ({ ...prev, serialNumber: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Инв. номер</label>
              <input
                type="text"
                value={editObjectData.inventoryNumber || ''}
                onChange={(e) => setEditObjectData(prev => ({ ...prev, inventoryNumber: e.target.value }))}
                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </>
        )}

        {/* Климатическая установка для всех типов кроме холодильника и морозильника */}
        {!['холодильник', 'морозильник'].includes(obj.type) && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Климатическая установка</label>
            <input
              type="text"
              value={editObjectData.climateSystem || ''}
              onChange={(e) => setEditObjectData(prev => ({ ...prev, climateSystem: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Загрузка данных договора...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <h3 className="text-lg font-semibold text-red-800">Ошибка загрузки данных</h3>
        </div>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={onBack}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Вернуться к проектам
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <Building2 className="w-8 h-8 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Согласование договора</h1>
          <p className="text-gray-600">{project.name}</p>
        </div>
      </div>

      {/* Project Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-sm font-medium text-blue-900">Дата создания:</span>
            <div className="text-blue-800">{project.createdAt.toLocaleDateString('ru-RU')}</div>
          </div>
          <div>
            <span className="text-sm font-medium text-blue-900">Примерная дата завершения:</span>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-blue-800 font-medium">
                {estimatedCompletionDate.toLocaleDateString('ru-RU')}
              </span>
            </div>
          </div>
          <div>
            <span className="text-sm font-medium text-blue-900">Номер договора:</span>
            <div className="text-blue-800">{project.contractNumber || 'Не указан'}</div>
          </div>
        </div>
      </div>

      {/* Contractor Information (Read-only) */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Информация о контрагенте</h2>
        
        {contractor ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Наименование</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                  {contractor.name}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Адрес</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                  {contractor.address || 'Не указан'}
                </div>
              </div>
            </div>

            {/* Contacts */}
            {contractor.contacts.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Контакты</label>
                <div className="space-y-2">
                  {contractor.contacts.map((contact) => (
                    <div key={contact.id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm font-medium text-gray-900">{contact.employeeName}</div>
                      {contact.phone && (
                        <div className="text-sm text-gray-600">📞 {contact.phone}</div>
                      )}
                      {contact.comment && (
                        <div className="text-xs text-gray-500">{contact.comment}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <p>Информация о контрагенте недоступна</p>
          </div>
        )}
      </div>

      {/* Qualification Objects (Editable) */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Объекты квалификации</h2>
        
        {qualificationObjects.length > 0 ? (
          <div className="space-y-4">
            {qualificationObjects.map((obj) => (
              <div key={obj.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {QualificationObjectTypeLabels[obj.type]}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Создан: {obj.createdAt.toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    {editingObject === obj.id ? (
                      <>
                        <button
                          onClick={handleSaveObject}
                          disabled={operationLoading}
                          className="text-green-600 hover:text-green-800 transition-colors"
                          title="Сохранить изменения"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="text-gray-600 hover:text-gray-800 transition-colors"
                          title="Отменить изменения"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleEditObject(obj)}
                        disabled={operationLoading}
                        className="text-indigo-600 hover:text-indigo-800 transition-colors"
                        title="Редактировать"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {renderObjectFields(obj)}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Объекты квалификации не найдены</p>
            <p className="text-sm">Проверьте настройки проекта</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Действия по договору</h2>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="text-sm font-medium text-green-900">Готовность к согласованию</h3>
              <p className="text-sm text-green-700">
                Информация о контрагенте и объектах квалификации проверена и готова для согласования договора
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={onBack}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Завершить согласование</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};