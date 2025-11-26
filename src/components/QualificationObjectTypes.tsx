import React, { useState, useEffect } from 'react';
import { Building2, Car, Snowflake, Package, Box, Edit, Eye } from 'lucide-react';
import { QualificationObjectType, qualificationObjectTypeService } from '../utils/qualificationObjectTypeService';
import { QualificationObjectTypeEdit } from './QualificationObjectTypeEdit';

const QualificationObjectTypes: React.FC = () => {
  const [types, setTypes] = useState<QualificationObjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'edit' | 'view'>('list');
  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    try {
      setLoading(true);
      const data = await qualificationObjectTypeService.getAllTypes();
      setTypes(data);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки типов объектов квалификации');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (typeKey: string) => {
    switch (typeKey) {
      case 'помещение':
        return Building2;
      case 'автомобиль':
        return Car;
      case 'холодильная_камера':
        return Snowflake;
      case 'холодильник':
      case 'морозильник':
        return Box;
      default:
        return Package;
    }
  };

  const handleEdit = (typeId: string) => {
    setSelectedTypeId(typeId);
    setViewMode('edit');
  };

  const handleView = (typeId: string) => {
    setSelectedTypeId(typeId);
    setViewMode('view');
  };

  const handleBack = () => {
    setSelectedTypeId(null);
    setViewMode('list');
    loadTypes(); // Перезагружаем список при возврате
  };

  if (viewMode === 'edit' || viewMode === 'view') {
    if (!selectedTypeId) return null;
    return (
      <QualificationObjectTypeEdit
        typeId={selectedTypeId}
        onBack={handleBack}
        mode={viewMode}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-red-600 mb-4">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Объекты квалификации</h1>
            <p className="mt-1 text-sm text-gray-500">
              Список типов объектов квалификации, используемых в системе
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {types.map((type) => {
                const Icon = getTypeIcon(type.type_key);

                return (
                  <div
                    key={type.id}
                    className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <Icon className="w-6 h-6 text-indigo-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900">{type.type_label}</h3>
                          <p className="mt-2 text-sm text-gray-600">{type.description || 'Нет описания'}</p>
                          <div className="mt-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {type.type_key}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2 ml-4">
                        <button
                          onClick={() => handleView(type.id)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-md"
                          title="Просмотр"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleEdit(type.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-md"
                          title="Редактировать"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">
                Информация о типах объектов квалификации
              </h3>
              <p className="text-sm text-blue-700">
                Каждый тип объекта квалификации имеет свои характеристики и параметры, которые используются 
                при проведении испытаний и анализе микроклиматических условий. Выберите соответствующий тип 
                при создании нового объекта квалификации в разделе "Проекты".
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QualificationObjectTypes;

