import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Save, X, Building, Car, Refrigerator, Snowflake, MapPin, Trash2 } from 'lucide-react';
import { QualificationObject, QualificationObjectTypeLabels, CreateQualificationObjectData } from '../../types/QualificationObject';
import { qualificationObjectService } from '../../utils/qualificationObjectService';
import { QualificationObjectForm } from '../QualificationObjectForm';
import { QualificationObjectsTable } from '../QualificationObjectsTable';
import { TestingPeriodsCRUD } from '../TestingPeriodsCRUD';

interface QualificationObjectsCRUDProps {
  contractorId: string;
  contractorName: string;
  projectId?: string;
}

export const QualificationObjectsCRUD: React.FC<QualificationObjectsCRUDProps> = ({ 
  contractorId, 
  contractorName,
  projectId
}) => {
  const [objects, setObjects] = useState<QualificationObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingObject, setEditingObject] = useState<QualificationObject | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Загрузка объектов квалификации
  const loadObjects = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await qualificationObjectService.getQualificationObjectsByContractor(contractorId);
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

  // Создание нового объекта
  const handleCreate = async (object: QualificationObject) => {
    setObjects(prev => [object, ...prev]);
  };

  // Обновление объекта
  const handleUpdate = async (object: QualificationObject) => {
    try {
      // Обновляем объект в базе данных
      const updatedObject = await qualificationObjectService.updateQualificationObject(
        object.id,
        object
      );
      
      // Обновляем локальное состояние
      setObjects(prev => prev.map(obj => obj.id === object.id ? updatedObject : obj));
      setEditingObject(null);
      
      console.log('Объект квалификации успешно обновлен в БД:', updatedObject);
    } catch (error) {
      console.error('Ошибка обновления объекта квалификации:', error);
      alert(`Ошибка сохранения изменений: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  // Удаление объекта
  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот объект квалификации?')) {
      return;
    }

    try {
      await qualificationObjectService.deleteQualificationObject(id);
      setObjects(prev => prev.filter(obj => obj.id !== id));
    } catch (error) {
      console.error('Ошибка удаления объекта:', error);
      alert(`Ошибка удаления объекта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Объекты квалификации</h2>
          <p className="text-sm text-gray-600 mt-1">
            Контрагент: <span className="font-medium">{contractorName}</span>
          </p>
        </div>
      </div>

      {/* Testing Periods for each object - only show if projectId is provided */}
      {projectId && objects.length > 0 && (
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Планирование испытаний</h3>
          {objects.map((obj) => {
            const objectName = obj.name || obj.vin || obj.serialNumber || 'Без названия';
            return (
              <TestingPeriodsCRUD
                key={obj.id}
                qualificationObjectId={obj.id}
                qualificationObjectName={objectName}
                projectId={projectId}
              />
            );
          })}
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

      {/* Objects Table */}
      <QualificationObjectsTable
        objects={objects}
        onAdd={() => {}}
        onEdit={(obj) => {
          console.log('Setting editing object:', obj);
          setEditingObject(obj);
        }}
        onDelete={handleDelete}
        onShowOnMap={(obj) => {
          console.log('Show on map:', obj);
        }}
        loading={loading}
        hideAddButton={true}
        editingQualificationObject={editingObject}
        onSaveQualificationObject={async (objectData) => {
          console.log('Saving object:', objectData);
          await handleUpdate(objectData);
        }}
        onCancelQualificationObjectEdit={() => setEditingObject(null)}
        contractorId={contractorId}
      />

    </div>
  );
};