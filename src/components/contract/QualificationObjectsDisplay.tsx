import React, { useState, useEffect } from 'react';
import { Building, Car, Refrigerator, Snowflake, MapPin, AlertTriangle, Loader } from 'lucide-react';
import { QualificationObject, QualificationObjectTypeLabels } from '../../types/QualificationObject';
import { qualificationObjectService } from '../../utils/qualificationObjectService';

interface QualificationObjectsDisplayProps {
  contractorId: string;
  contractorName: string;
  selectedObjectIds: string[];
}

export const QualificationObjectsDisplay: React.FC<QualificationObjectsDisplayProps> = ({ 
  contractorId, 
  contractorName,
  selectedObjectIds
}) => {
  const [objects, setObjects] = useState<QualificationObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка объектов квалификации
  const loadObjects = async () => {
    if (!qualificationObjectService.isAvailable()) {
      setError('Supabase не настроен для работы с объектами квалификации');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Загружаем все объекты контрагента
      const allObjects = await qualificationObjectService.getQualificationObjectsByContractor(contractorId);
      
      // Фильтруем только выбранные объекты
      const selectedObjects = allObjects.filter(obj => selectedObjectIds.includes(obj.id));
      
      setObjects(selectedObjects);
      console.log('Загружены выбранные объекты квалификации:', selectedObjects.length);
    } catch (error) {
      console.error('Ошибка загрузки объектов:', error);
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedObjectIds.length > 0) {
      loadObjects();
    }
  }, [contractorId, selectedObjectIds]);

  // Получение иконки для типа объекта
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'помещение':
        return <Building className="w-5 h-5 text-blue-600" />;
      case 'автомобиль':
        return <Car className="w-5 h-5 text-green-600" />;
      case 'холодильная_камера':
        return <Refrigerator className="w-5 h-5 text-cyan-600" />;
      case 'холодильник':
        return <Refrigerator className="w-5 h-5 text-blue-500" />;
      case 'морозильник':
        return <Snowflake className="w-5 h-5 text-indigo-600" />;
      default:
        return <Building className="w-5 h-5 text-gray-600" />;
    }
  };

  // Рендер деталей объекта в зависимости от типа
  const renderObjectDetails = (obj: QualificationObject) => {
    const details = [];

    if (obj.address) details.push(`📍 ${obj.address}`);
    if (obj.area) details.push(`📐 ${obj.area} м²`);
    if (obj.vin) details.push(`🔢 VIN: ${obj.vin}`);
    if (obj.registrationNumber) details.push(`🚗 ${obj.registrationNumber}`);
    if (obj.bodyVolume) details.push(`📦 ${obj.bodyVolume} м³`);
    if (obj.inventoryNumber) details.push(`📋 Инв. №: ${obj.inventoryNumber}`);
    if (obj.chamberVolume) details.push(`📦 ${obj.chamberVolume} л`);
    if (obj.serialNumber) details.push(`🔢 S/N: ${obj.serialNumber}`);
    if (obj.manufacturer) details.push(`🏭 ${obj.manufacturer}`);
    if (obj.climateSystem) details.push(`❄️ ${obj.climateSystem}`);

    return details;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Объекты квалификации</h2>
          <p className="text-sm text-gray-600 mt-1">
            Контрагент: <span className="font-medium">{contractorName}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Отображаются только объекты, выбранные на этапе согласования договора
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Ошибка загрузки объектов</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <Loader className="animate-spin w-8 h-8 text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Загрузка объектов квалификации...</p>
        </div>
      )}

      {/* Objects Display */}
      {!loading && selectedObjectIds.length === 0 && (
        <div className="text-center py-8">
          <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Объекты квалификации не выбраны</p>
          <p className="text-sm text-gray-500 mt-1">
            Вернитесь на этап согласования договора для выбора объектов
          </p>
        </div>
      )}

      {!loading && objects.length === 0 && selectedObjectIds.length > 0 && (
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600">Выбранные объекты квалификации не найдены</p>
          <p className="text-sm text-gray-500 mt-1">
            Возможно, объекты были удалены или изменены
          </p>
        </div>
      )}

      {!loading && objects.length > 0 && (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 mb-4">
            Выбрано объектов: <span className="font-medium">{objects.length}</span>
          </div>
          
          {objects.map((object) => (
            <div key={object.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-start space-x-3">
                <div className="mt-1">
                  {getTypeIcon(object.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-medium text-gray-900">
                      {object.name || object.vin || object.serialNumber || 'Без названия'}
                    </h3>
                    <span className="px-2 py-1 bg-white text-gray-700 text-xs rounded-full border">
                      {QualificationObjectTypeLabels[object.type]}
                    </span>
                  </div>
                  
                  {/* Детали объекта */}
                  <div className="space-y-1">
                    {renderObjectDetails(object).map((detail, index) => (
                      <div key={index} className="text-sm text-gray-600">
                        {detail}
                      </div>
                    ))}
                  </div>

                  {/* Файлы объекта */}
                  {(object.planFileUrl || object.testDataFileUrl) && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-xs text-gray-500 mb-2">Прикрепленные файлы:</div>
                      <div className="flex items-center space-x-3">
                        {object.planFileUrl && (
                          <a
                            href={object.planFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-xs flex items-center space-x-1"
                          >
                            <span>📋 План объекта</span>
                          </a>
                        )}
                        {object.testDataFileUrl && (
                          <a
                            href={object.testDataFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-800 text-xs flex items-center space-x-1"
                          >
                            <span>📊 Данные испытаний</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {!loading && objects.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Сводка по объектам:</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            {Object.entries(QualificationObjectTypeLabels).map(([type, label]) => {
              const count = objects.filter(obj => obj.type === type).length;
              return count > 0 ? (
                <div key={type} className="flex items-center space-x-2">
                  {getTypeIcon(type)}
                  <span className="text-blue-800">{label}: {count}</span>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
};